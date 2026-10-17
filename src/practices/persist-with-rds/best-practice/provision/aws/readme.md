# provision / aws

the declastruct-aws wish for this service's aws resources.

- `resources.ts` — the wish entrypoint (providers + `getResources`).
- `resources.parameters.ts` — the secret ssm parameters, adopted from terraform.
- `product/parameter-store.tf` — the terraform FORGET blocks (transitional).

## why declastruct-aws, not terraform

terraform managed these secrets with the `__IGNORED__` + `ignore_changes = [value]`
workaround: the value was written once at seed, then terraform pretended it never
drifted. that hides real drift and forces the secret through terraform state.

`DeclaredAwsSsmParameterSecure` is **write-only by contract**:

| phase | reads value? | kms | api |
| ----- | ------------ | --- | --- |
| plan  | never        | no kms:Decrypt | DescribeParameters (metadata only) |
| apply | only when a value is supplied | kms:Encrypt | PutParameter |

## the param names

each name is the one sdk-config (>= 0.3.0) derives for a bare `$.at(aws::param)` in
`config/{env}.json`:

```
/{org}/{project}/{config}/{keyPath}
```

| config key | ssm name (prep) |
| ---------- | --------------- |
| `database.role.crud.password` | `/{org}/{project}/prep/database.role.crud.password` |
| `database.role.cicd.for-plan.password` | `/{org}/{project}/prep/database.role.cicd.for-plan.password` |
| `database.role.cicd.for-apply.password` | `/{org}/{project}/prep/database.role.cicd.for-apply.password` |

the config segment is the CONFIG slug (`CONFIG`), never the access: config's reader, the
oidc iam policy, and the declared `name` must be byte-identical.

## adoption by absence

the wish supplies **no `value`**: a value-less secret is write-only KEEP. plan reports
KEEP for every extant param and never reads or rewrites it.

- a **CREATE at plan** means no live param holds that name yet → copy its value first
  (below), never let the apply create it.
- a value-less secret that is **ABSENT** throws on apply (declastruct-aws
  `setSsmParameterSecure`). only prep + prod apply the wish, so test never meets it.

## copy params to the derived names (before the first plan at a new name)

a repo whose values sit at a prior name holds no value at the derived name, so its
first `provision` apply throws at the absent param. copy each value first, per env
(prep, then prod). a copy keeps the source param, so it is safe to repeat.

| prior name | derived name |
| ---------- | ------------ |
| `{org}.{project}.{dev\|prod}.database.role.crud.password` | `/{org}/{project}/{config}/database.role.crud.password` |
| `/{org}/{project}/database/role/cicd/for-plan/password` | `/{org}/{project}/{config}/database.role.cicd.for-plan.password` |
| `/{org}/{project}/database/role/cicd/for-apply/password` | `/{org}/{project}/{config}/database.role.cicd.for-apply.password` |

where the roles were also renamed (`role.admin` / `role.service` in an older config), the
values move with the rename:

| prior role | derived name it seeds |
| ---------- | --------------------- |
| `admin` | `/{org}/{project}/{config}/database.role.cicd.for-plan.password` |
| `admin` | `/{org}/{project}/{config}/database.role.cicd.for-apply.password` |
| `service` | `/{org}/{project}/{config}/database.role.crud.password` |

the copy is a manual aws ssm step, run with the access for the env:

```sh
VALUE=$(aws ssm get-parameter --with-decryption --name "<prior name>" --query Parameter.Value --output text)
aws ssm put-parameter --type SecureString --name "<derived name>" --value "$VALUE"
```

then set each `config/{env}.json` password to the bare `$.at(aws::param)`.

## iam boundary (the two oidc roles)

the prod oidc plan/apply split (see `.github/workflows/.declastruct.yml`, the aws-auth
path) maps onto the write-only contract exactly:

- **plan role** (`CREDS_CICD_AWS_PROD_OIDC_PLAN_ROLE_ARN`): `ssm:DescribeParameters` +
  `ssm:ListTagsForResource` only. NO `ssm:GetParameter`, NO `kms:Decrypt` — it
  reconciles metadata. its ONE decrypt exception is the
  `/{org}/{project}/{config}/database.role.cicd.for-plan.password` credential.
- **apply role** (`CREDS_CICD_AWS_PROD_OIDC_APPLY_ROLE_ARN`): `ssm:PutParameter` +
  `kms:Encrypt` (default `aws/ssm` key) + the tag write perms. never needs decrypt.

tags conform to the access vocab (`prep`), so an apply reconciles a live `dev` tag to
`prep` (a metadata-only change, no value write).

## order of operations (once per env — prep, then prod)

the handoff is lossless because terraform forgets the param without a destroy of the
live value. run ONCE per env, in order:

1. copy params to the derived names (above).
2. `npx declapract apply` — the `terraform-parameters` bad-practice rewrites every
   `resource "aws_ssm_parameter"` in `product/parameter-store.tf` into a `removed{}`
   forget block (`destroy = false`) and drops the `data` reads; a forget of an
   admin/service param names its copy target in a comment. requires terraform >= 1.7
   (bump `versions.tf#required_version` if below).
3. `terraform apply` (the `aws-*-terraform` provision jobs) — terraform drops the
   params from state; live values untouched. 🚩 if the plan shows any
   `DeleteParameter`, STOP — the forget is wrong.
4. declastruct plan/apply the wish (the `aws-*-declastruct` provision jobs) — plan
   shows KEEP for every param (no decrypt). a CREATE means a value was not copied → STOP.

after both land in every env, the `removed{}` blocks (and this transitional tf file)
can be pruned in a follow-up.
