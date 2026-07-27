# define.declastruct-goforward

## .what

**declastruct is the blessed go-forward for infrastructure provision in this repo.**
terraform is in **deprecation** — we move resource-class by resource-class off terraform
onto declastruct, never the reverse. new resources are declared as declastruct wishes;
extant terraform resources are migrated when touched.

## .why declastruct over terraform

- **one language.** wishes are typescript (`declastruct` + `declastruct-*` providers) —
  same language, same domain-objects, same tests as the service. no HCL context-switch.
- **imperative reach.** a wish is real code: it can read siblings, compute names, adopt
  live resources by absence. terraform's declarative model cannot.
- **idempotent get+set.** the declastruct pattern is idempotent by construction (plan →
  KEEP/CREATE/UPDATE → apply). see `rule.prefer.declastruct.[demo]` (mechanic).
- **no state-file custody.** declastruct reconciles against the live resource, not a
  state file that can drift or leak secrets (terraform's `__IGNORED__` +
  `ignore_changes` workaround for secrets is exactly the drift-hider we left behind).

## .how a wish is shaped

a wish is a directory (e.g. `provision/aws/`) with two entrypoints:

```ts
// resources.ts — providers + the resource set
export const getProviders = async (): Promise<DeclastructProvider[]> => [ … ];
export const getResources = async (): Promise<DomainEntity<any>[]> => getParameters();
```

- **providers** authenticate + target a backend (aws, github, …).
- **getResources** returns the declared resources (each a `Declared*` domain-object with
  a natural unique key for idempotency).
- run via `npx declastruct plan --wish <path> --into <path>.plan.json` then
  `npx declastruct apply --plan <path>.plan.json`. plan is uploaded as an artifact so
  apply executes the EXACT plan reviewers saw.

## .the one reusable ci workflow

`.github/workflows/.declastruct.yml` (practice **cicd-common**) runs the shared
plan→artifact→apply shape for BOTH backends. it carries two auth models, each gated by a
conditional step that fires only when its creds are supplied:

| backend | auth step fires when | auth | for |
| ------- | -------------------- | ---- | --- |
| github | `creds-github-app-id` set | github-app-token → `GITHUB_TOKEN` | github-provider wishes (repo/settings) |
| aws | `creds-aws-role-arn-plan` / `-apply` set | oidc role assumption (`id-token: write`) + `ACCESS` | aws-provider wishes (ssm, etc.) |

### the aws specifics folded in

- **oidc auth.** `permissions: id-token: write` (unused by the github path) + a
  conditional `configure-aws-credentials` step keyed on the role-arn inputs.
- **plan/apply oidc role SPLIT.** the github path uses ONE token for both jobs. the aws
  path assumes TWO roles: the **plan** role is readonly (`DescribeParameters`, never
  `kms:Decrypt`) and the **apply** role is a writer (`PutParameter` + `kms:Encrypt`).
  this split enforces the write-only-secret contract at the IAM layer.
- **fully-qualified plan artifact.** every call names its plan artifact
  `declastruct-${{ inputs.scope }}-${{ inputs.access }}-plan` (scope ∈ github | aws), so
  no two parallel calls collide — e.g. `declastruct-github-prod-plan`,
  `declastruct-aws-prep-plan`, `declastruct-aws-prod-plan`.
- **access-scoped runtime.** the workflow sets the `ACCESS` envar (read by the wish via
  sdk-environment — see `define.sdk-environment-shape`). github wishes pass `access: prod`
  (repo settings are inherently a prod resource).

### env gates

both jobs gate on a github environment: `github-environment-plan` (plan) and
`github-environment-apply` (apply) — to conform with the terraform + sql-schema flows.
github wishes typically set only `-apply` (gate the write, leave plan ungated); aws-prod
sets both.

## .the terraform→declastruct migration

when a resource-class moves off terraform, do NOT delete the terraform resource (that
issues a live destroy). instead **forget** it: rewrite each `resource {…}` into a
`removed { from = … lifecycle { destroy = false } }` block (terraform >= 1.7) so it
leaves state but the live resource stays. declastruct then adopts it. the SSM-off-terraform
migration is the worked example — see:

- `howto.craft-practice-migrations` — the two-practice migration pattern
- `src/practices/persist-with-rds/best-practice/provision/aws/` — the go-forward wish
- `src/practices/persist-with-rds/bad-practices/terraform-parameters/` — the forget-rewrite
- `src/practices/persist-with-rds/best-practice/provision/aws/readme.md` — the runbook + the
  🚩 `DeleteParameter` stop-sign

## .see also

- `rule.prefer.declastruct.[demo]` (mechanic) — the get+set idempotent wish pattern
- `define.sdk-environment-shape` — how the aws wish reads its access tier
- `define.infrastructure-dev-vs-application-prep` — the dev↔prep name bridge for migrated infra
- `howto.craft-practice-migrations` — automate a practice-to-practice migration
- package: `declastruct`, `declastruct-aws` (ehmpathy)
