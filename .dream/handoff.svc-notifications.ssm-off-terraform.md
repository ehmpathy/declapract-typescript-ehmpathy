# handoff → ahbode/svc-notifications: move SSM params off terraform into declastruct-aws

## .what

move every SSM Parameter Store param out of terraform (`provision/aws/product/
parameter-store.tf`) into a declastruct-aws wish, such that terraform **forgets** them
(without loss of the live value) and declastruct owns the go-forward names.

## .why

declastruct is the go-forward pattern. terraform manages these secrets via the
`__IGNORED__` + `ignore_changes = [value]` workaround, which hides real drift and
forces the secret through terraform state. declastruct-aws@1.9.0 shipped
`DeclaredAwsSsmParameterSecure` — write-only by contract (plan never decrypts) — which
replaces that workaround with a real contract.

the reference implementation is the `persist-with-rds` best-practice in
`declapract-typescript-ehmpathy`. copy its shape; this doc maps it onto your params.

---

## the model in one breath

1. the wish declares ONLY the names declastruct owns **as of now**.
2. the OLD names are **forgotten from terraform** and left to **float** unmanaged in
   aws — declastruct never declares them; they exist only as a `from` seed source.
3. each go-forward param sources its value via `getSecretToMoveFromPrior({from, into})`:
   - `into` already present → `undefined` → **KEEP** (metadata-only DescribeParameters,
     no decrypt — plan-role safe on every reapply).
   - `into` absent → the decrypted value of `from`, to seed it once (writer-role only).

---

## your param inventory (read from your live parameter-store.tf)

all 8 are already `SecureString` today — so there is **no plain→secure move**, every
one is a straight Secure adoption.

| terraform param | go-forward `into` | seed `from` | note |
|---|---|---|---|
| `…database.admin.password` | (drop — legacy) | — | superseded by cicd; float only |
| `…database.service.password` | (drop — legacy) | — | superseded by crud; float only |
| `…database.role.cicd.password` | (drop — legacy) | — | superseded by for-plan/for-apply; float only |
| `…database.role.crud.password` | `…database.role.crud.password` | itself (adopt in place) | keeps its name |
| `/ahbode/svc-notifications/database/role/cicd/for-plan/password` | same (slash path) | `…database.role.cicd.password` | ⚠️ IAM-pinned path — do NOT reshape |
| `/ahbode/svc-notifications/database/role/cicd/for-apply/password` | same (slash path) | `…database.role.cicd.password` | apply-only; not readable by plan role |
| `…twilio.authToken` | `…twilio.authToken` | itself (adopt in place) | keeps its name |
| `…openphone.apikey` | `…openphone.apikey` | itself (adopt in place) | keeps its name |

decide per-param whether a legacy name is truly superseded (drop, float) or is the
go-forward name (adopt in place, `from === into`). the table above is a proposal —
confirm against what your config actually reads today.

### ⚠️ the byte-identical path pin

your plan role's ONE decrypt exception is pinned to
`arn:aws:ssm:*:*:parameter/*/svc-*/database/role/cicd/for-plan/*`. the
`/ahbode/svc-notifications/database/role/cicd/for-plan/password` slash path matches;
`for-apply` deliberately does NOT (apply creds stay unreadable to plan). **do not
rename or reshape these on the move** — the IAM policy pins them.

---

## files to author (mirror the reference)

copy these four from
`declapract-typescript-ehmpathy/src/practices/persist-with-rds/best-practice/provision/aws/ssm/`:

1. **`resources.parameters.ts`** — the wish. edit its `MOVES` list to YOUR params
   (the table above). it declares only go-forward names; value via
   `getSecretToMoveFromPrior`.
2. **`getSecretToMoveFromPrior.ts`** — the decision op (KEEP vs seed). copy as-is.
3. **`genSsmSecretPort.ts`** — the real `@aws-sdk/client-ssm` adapter
   (`hasValue`=DescribeParameters, `getValue`=GetParameter+decrypt). copy as-is.
4. **`readme.md`** — the runbook. copy + adjust the param names.

deps to add (see the reference `package.json`): `@aws-sdk/client-ssm`,
`declastruct`, `declastruct-aws` (>= 1.9.0), `domain-objects`, `helpful-errors`,
`sdk-logs`.

then, to retire terraform, apply the **`terraform-parameters` bad-practice**: it
rewrites every `resource "aws_ssm_parameter"` in your `parameter-store.tf` into a
`removed{}` forget block (`destroy = false`) and drops the `data "aws_ssm_parameter"`
reads. this needs terraform **>= 1.7** (the `removed{}` block). check your
`versions.tf` — bump `required_version` if it is below 1.7. if you cannot move to 1.7,
use the imperative fallback: `terraform state rm aws_ssm_parameter.<label>` per param
(note the count-guarded ones are `<label>[0]`).

---

## order of operations (ONCE per env — prep, then prod)

lossless because terraform forgets the param without a destroy of the live value.

1. **author + forget.** edit `MOVES`, run `declapract fix` (or hand-write the wish +
   the `removed{}` blocks). review the diff: the tf shows ONLY forget blocks, no
   resource deletes.
2. **`terraform apply`** (your `aws-*-terraform` provision jobs). terraform drops the
   params from state; live values untouched. 🚩 **if the plan shows any
   `DeleteParameter`, STOP** — the forget is wrong. the forgotten OLD names now float.
3. **declastruct plan → apply** (your `aws-*-declastruct` jobs):
   - a go-forward param that already exists → plans **KEEP** (no decrypt, plan-safe).
   - a NET-NEW go-forward name → its first apply seeds from `from` — a
     `GetParameter`+decrypt that needs the **writer role**. run that first seed under
     the apply job, not a plan. see the CI note below.
4. once both land, the now-empty `parameter-store.tf` (only forget blocks) can be
   deleted.

---

## CI: the plan/apply split (copy `.declastruct-aws.yml`)

the reference ships a reusable `.github/workflows/.declastruct-aws.yml` with the same
OIDC plan/apply split as your `.terraform.yml`:

- **plan job** — readonly role. `DescribeParameters` only, NO `kms:Decrypt`. it plans
  KEEP for present params. uploads the plan artifact.
- **apply job** — writer role. `PutParameter` + `kms:Encrypt`. consumes the artifact.

wire `aws-prep-declastruct` / `aws-prod-declastruct` jobs into `provision.yml` beside
your terraform jobs (the reference `provision.yml` shows the exact shape). prep omits
`github-environment` (repo-scoped OIDC, any branch); prod uses
`production-on-else-plan` / `production-on-main`.

### the first-seed caveat

the ONE step the plan role cannot do is read a secret value to seed a net-new param
(that needs decrypt). so the very first seed of a fresh env must execute under the
**writer/apply** role. two ways:

- run the seed as an apply-job step (writer creds, no value-carried artifact upload), or
- seed once out-of-band under writer creds, then let declastruct only ever KEEP.

steady-state reapply never hits this — it's a one-time, per-net-new-param event.

---

## apply-role IAM (declastruct reconcile perms)

- apply role: `ssm:PutParameter`, `ssm:AddTagsToResource`, `ssm:RemoveTagsFromResource`;
  for the first seed also `ssm:GetParameter` + `kms:Decrypt` on the `from` prior, and
  `kms:Encrypt` if you ever move off the default `aws/ssm` key.
- both roles: `ssm:DescribeParameters` (*-scoped, AWS-forced — cannot be
  resource-scoped, so plan can enumerate names + metadata account-wide, never values).
- plan role: keep `kms:Decrypt` OFF everywhere except the pinned for-plan path.

---

## stay on the default aws/ssm key (`keyId: null`)

it's the tested path and the plan role's decrypt pin already works with it. only move
to a CMK if you want the optional key-policy backstop (a hardened posture, not
required). the in-place CMK rotation path is not yet proven against live aws.

---

## cost

effectively $0. String vs SecureString: same storage (free, Standard tier). default
`aws/ssm` key has no monthly charge. only Secure-specific cost is KMS requests at
$0.03/10k — and the write-only pattern zeroes out reads (plan is metadata-only). no
cost reason to keep anything plain.

---

## proof you should mirror

the reference ships, and you should port:

- a `.declapract.integration.test.ts` that runs the REAL declapract pipeline against a
  `genTempDir` clone, snapshots the tf before/after, AND asserts a **twice-applied
  no-op** (idempotency).
- a unit test of `getSecretToMoveFromPrior` that proves: present `into` → KEEP with
  ZERO decrypt calls; absent `into` → seed from `from`; rerun → idempotent.

see `rule.require.declapract-integration-tests` and `rule.require.idempotent-fixes` in
the reference's `.agent/repo=.this/role=any/briefs/`.

---

## dependency status

✅ unblocked. `declastruct-aws@1.9.0` is published and ships
`DeclaredAwsSsmParameterSecure` (write-only, metadata-only Secure reconcile). all 8 of
your params are already SecureString, so this is a straight adoption — no type swap.
