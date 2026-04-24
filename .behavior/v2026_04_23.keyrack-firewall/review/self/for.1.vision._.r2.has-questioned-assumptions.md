# review.self: has-questioned-assumptions (r2)

## deeper review after first pass

the first pass revealed issues. this pass addresses them.

### issue found: scope is broader than vision stated

**the assumption**: vision only mentioned `.test.yml`

**the evidence**: grep shows `buildWorkflowSecretsBlock` is used by:
- `deploy.yml.declapract.ts` (cicd-service)
- `test.yml` workflows
- test infrastructure files

**impact**:
- the upgrade affects more than just test workflows
- deploy workflows also need firewall integration
- scope is larger than initially stated

**fix applied**: must expand vision scope to include all workflow types that use keyrack secrets

---

### issue found: buildWorkflowSecretsBlock cannot be deleted

**the assumption**: we can delete the file

**the evidence**: grep shows multiple imports:
- `src/practices/cicd-service/best-practice/.github/workflows/deploy.yml.declapract.ts`
- `src/.test/infra/withKeyrackContext.ts`
- test files

**impact**:
- cannot simply delete the file
- need to migrate all consumers first
- or refactor the file to use firewall pattern internally

**fix applied**: change from "delete" to "refactor or deprecate"

---

### issue found: `$GITHUB_ENV` job scope

confirmed from first pass: `$GITHUB_ENV` is job-scoped.

**impact on vision**:
- firewall must run in each job that needs secrets
- for sharded tests (test-integration, test-acceptance), each job needs firewall step
- this is more steps than vision suggested

**fix applied**: update mental model to show firewall per job, not per workflow

---

### assumption validated: PR #344 merged

**evidence**: `gh pr view 344 --repo ehmpathy/rhachet` shows:
- state: MERGED
- mergedAt: 2026-04-23T12:12:39Z

✅ **holds**: firewall command is available

---

### assumption validated: secrets context available

**evidence**: GitHub Actions docs confirm `secrets` context is available in:
- caller workflows
- callee workflows via `secrets: inherit` or explicit pass

✅ **holds**: firewall can access secrets via `toJSON(secrets)`

---

## vision corrections needed

1. **scope**: include deploy.yml, not just test.yml
2. **deletion**: change to "refactor" buildWorkflowSecretsBlock.ts
3. **job placement**: firewall step per job, not per workflow
4. **consumer count**: acknowledge multiple workflow types need migration

## fixes applied to vision

### fix 1: scope expanded

**before**: "upgrade from adhoc secrets parse to `rhx keyrack firewall` for CI workflow secrets injection."

**after**: added scope line: "**scope**: all workflow types that use keyrack secrets (test.yml, deploy.yml, etc.)"

### fix 2: deletion → refactor

**before**: "1. **delete** `buildWorkflowSecretsBlock.ts` — no longer needed"

**after**: "1. **refactor** `buildWorkflowSecretsBlock.ts` — replace slug parse with firewall invocation, or delete if no longer needed"

### fix 3: job scope clarified

**before**: vision implied one firewall step per workflow

**after**: added note: "**note on `$GITHUB_ENV`**: firewall exports to `$GITHUB_ENV`, which is job-scoped. each job that needs secrets must run the firewall step."

### fix 4: PR #344 validated

**before**: "- [ ] PR #344 is merged and released"

**after**: "- [x] PR #344 is merged and released (merged 2026-04-23)"

## summary

the core vision remains valid:
- use `rhx keyrack firewall` instead of adhoc parse
- offload complexity to rhachet
- improve security via pattern validation

the refinements ensure the vision accurately reflects implementation scope and constraints.
