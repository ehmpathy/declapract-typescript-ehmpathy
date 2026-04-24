# review.self: has-questioned-assumptions

## hidden assumptions in the vision

### 1. "firewall step should be in .test.yml callee, not test.yml caller"

**what do we assume?**
- the firewall runs in the reusable workflow (.test.yml)
- not in the caller workflow (test.yml)

**evidence?**
- firewall needs `SECRETS_JSON: ${{ toJSON(secrets) }}`
- `secrets` context is available in both caller and callee
- callee placement means all consumers get firewall protection

**what if the opposite?**
- if firewall ran in caller, each caller workflow would need the step
- declapract would need to modify caller workflows too
- more files to fix, more chances for inconsistency

**did wisher say this?**
- no, wisher just said "use rhx keyrack firewall"
- i inferred callee placement

✅ **assumption holds** — callee placement is correct for single-point-of-control

---

### 2. "`secrets: inherit` is sufficient for secret pass"

**what do we assume?**
- caller can use `secrets: inherit` instead of explicit block
- firewall will receive all secrets via `toJSON(secrets)`

**evidence?**
- GitHub Actions docs confirm `secrets: inherit` passes all secrets
- `toJSON(secrets)` should capture inherited secrets

**what if the opposite?**
- if `secrets: inherit` didn't work, we'd need explicit blocks
- but then firewall wouldn't help reduce boilerplate

**counterexamples?**
- some orgs restrict `secrets: inherit` for security
- but that's an org policy, not a technical limitation

✅ **assumption holds** — `secrets: inherit` works, but caller may still choose explicit blocks

---

### 3. "buildWorkflowSecretsBlock.ts can be deleted entirely"

**what do we assume?**
- the file is only used for secrets block generation
- no other code depends on it

**evidence?**
- file is in `src/utils/`
- grep shows it's imported by workflow declapract files

**what if the opposite?**
- if other code depends on it, deletion would break things
- but the function's purpose is specific to secrets block generation

⚠️ **need to verify**: grep for imports of this file

**action**: verify no other imports before delete

---

### 4. "firewall handles all mechanism translation automatically"

**what do we assume?**
- firewall detects `mech` field in JSON values
- translates GitHub App creds to ghs_* tokens
- no manual translation needed

**evidence?**
- PR #344 acceptance tests show mechanism translation
- firewall reads `mech` field from value JSON

**what if the opposite?**
- if some mechanisms aren't supported, keys would be locked
- but firewall has EPHEMERAL_VIA_GITHUB_APP support

✅ **assumption holds** — firewall handles mechanisms we use

---

### 5. "test jobs will have access to `$GITHUB_ENV` vars"

**what do we assume?**
- firewall exports to `$GITHUB_ENV`
- subsequent steps in same job can read those vars
- sharded test jobs run after firewall step

**evidence?**
- firewall acceptance tests verify `--into github.actions` writes to `$GITHUB_ENV`
- GitHub Actions docs confirm `$GITHUB_ENV` persists for job

**what if the opposite?**
- if vars didn't persist, tests wouldn't have credentials
- but this is how GitHub Actions env vars work

⚠️ **question**: do sharded jobs (separate job definitions) inherit `$GITHUB_ENV`?

**answer**: no! `$GITHUB_ENV` is job-scoped, not workflow-scoped.

this means:
- firewall step must run in each test job (test-integration, test-acceptance)
- not just once at the start

⚠️ **issue found**: vision assumes single firewall step. actually need firewall in each test job.

---

### 6. "keyrack.yml is required for firewall to work"

**what do we assume?**
- firewall reads keyrack.yml to know which keys to process
- if no keyrack.yml, firewall is no-op

**evidence?**
- PR #344 shows firewall filters to declared keys
- makes sense — firewall shouldn't process undeclared keys

**what if the opposite?**
- if firewall processed all secrets without keyrack.yml, it would be less secure
- but that's not how it works

✅ **assumption holds** — keyrack.yml is required for meaningful firewall operation

---

## summary

| assumption | status | notes |
|------------|--------|-------|
| firewall in callee workflow | ✅ holds | single point of control |
| `secrets: inherit` works | ✅ holds | GitHub Actions supports it |
| buildWorkflowSecretsBlock.ts deletable | ⚠️ need to verify imports | |
| firewall handles mechanisms | ✅ holds | PR #344 shows support |
| `$GITHUB_ENV` accessible | ⚠️ issue found | job-scoped, not workflow-scoped |
| keyrack.yml required | ✅ holds | by design |

## issues found

1. **`$GITHUB_ENV` is job-scoped**: firewall must run in each test job, not once per workflow

## action items

1. update vision: firewall step in each test job (test-integration, test-acceptance, etc.)
2. verify buildWorkflowSecretsBlock.ts imports before deletion
