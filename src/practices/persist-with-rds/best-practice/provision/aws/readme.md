# provision / aws

the declastruct-aws wish for this service's aws resources.

- `resources.ts` — the wish entrypoint (providers + `getResources`).
- `resources.parameters.ts` — the secret SSM parameters, adopted from terraform.
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

## adoption by absence (no seed machinery)

the go-forward params ALREADY hold their values in aws — terraform seeded them once,
and the values live only there. so the wish supplies **no `value`**: a value-less
secret is write-only KEEP. plan reports KEEP for every extant param and never reads or
rewrites it. there is no value to "move" or "seed" — adoption is pure KEEP.

- a **CREATE at plan** means the declared name does not match a live param → STOP and
  fix the name.
- a value-less secret that is **ABSENT** throws on apply (declastruct-aws
  `setSsmParameterSecure`). the wish declares the db-role creds for every tier with no
  per-tier conditional; only prep + prod apply it (there is no `aws-test-declastruct`
  provision job), so the absent-throw never triggers in test.

## iam boundary (the two oidc roles)

the prod oidc plan/apply split (see `.github/workflows/.declastruct.yml`, the aws-auth
path) maps onto the write-only contract exactly:

- **plan role** (`CREDS_CICD_AWS_PROD_OIDC_PLAN_ROLE_ARN`): `ssm:DescribeParameters` +
  `ssm:ListTagsForResource` only. NO `ssm:GetParameter`, NO `kms:Decrypt` — it
  reconciles metadata. its ONE decrypt exception is the `database.role.cicd.for-plan`
  credential at the config layer.
- **apply role** (`CREDS_CICD_AWS_PROD_OIDC_APPLY_ROLE_ARN`): `ssm:PutParameter` +
  `kms:Encrypt` (default `aws/ssm` key) + the tag write perms. never needs decrypt.

the param **name** is the join point: config's reader, the oidc iam policy, and the
declared `name` must be byte-identical. do NOT reshape the path.

## the prep→dev name cast

terraform seeded these params under `var.environment`, where the prep account carries
the legacy `dev` label (see `define.infrastructure-dev-vs-application-prep`). the live
param NAMES contain that literal `dev`, so `resources.parameters.ts` casts the
namespace prep→dev. tags do NOT cast — they conform to the access vocab (`prep`), so
the first apply reconciles the live `environment` tag dev→prep (a metadata-only change,
no value write).

## order of operations (once per env — prep, then prod)

the handoff is lossless because terraform forgets the param without a destroy of the
live value. run ONCE per env, in order:

1. apply the `terraform-parameters` bad-practice (`declapract fix`) — it rewrites every
   `resource "aws_ssm_parameter"` in `product/parameter-store.tf` into a `removed{}`
   forget block (`destroy = false`) and drops the `data` reads. requires terraform
   >= 1.7 (bump `versions.tf#required_version` if below).
2. `terraform apply` (the `aws-*-terraform` provision jobs) — terraform drops the
   params from state; live values untouched. 🚩 if the plan shows any
   `DeleteParameter`, STOP — the forget is wrong.
3. declastruct plan/apply the wish (the `aws-*-declastruct` provision jobs) — plan
   shows KEEP for every param (no decrypt). a CREATE means a name mismatch → STOP.

after both land in every env, the `removed{}` blocks (and this transitional tf file)
can be pruned in a follow-up.
