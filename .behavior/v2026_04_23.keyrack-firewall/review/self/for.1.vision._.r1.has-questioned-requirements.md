# review.self: has-questioned-requirements

## requirements from the vision

### 1. "delete buildWorkflowSecretsBlock.ts"

**who said?** inferred from wish — "remove adhoc secrets parse"

**evidence?**
- file contains adhoc slug parse: `.split('.').pop()!`
- firewall handles this parse internally
- file becomes obsolete when firewall is used

**what if we didn't?**
- file would remain but never be called
- dead code accumulates
- **verdict**: delete is correct

**simpler way?**
- no — deletion is already the simplest path

✅ **requirement holds**

---

### 2. "simplify .test.yml.declapract.ts — remove slug parse logic"

**who said?** inferred from wish — "remove adhoc secrets parse"

**evidence?**
- `getKeyrackKeys()` function parses slugs manually
- `buildExpectedContent()` builds secrets/env blocks
- firewall replaces both functions

**what if we didn't?**
- file would generate secrets blocks that conflict with firewall step
- both paths would try to inject keys — redundant

**simpler way?**
- could keep the file and just add firewall step
- but then we have two mechanisms for the same job
- **verdict**: simplify is correct, but need to verify what remains

⚠️ **question**: does .test.yml.declapract.ts still need to exist at all? or does the template file (.test.yml) now handle all?

**answer**: yes, it likely still needs to exist for the `check` function to validate the template is correct. but the `buildExpectedContent` logic should be much simpler — just verify firewall step is present.

✅ **requirement holds, with refinement**: simplify, don't delete entirely

---

### 3. "update .test.yml — add firewall step with toJSON(secrets)"

**who said?** this is the core of PR #344

**evidence?**
- rhachet firewall acceptance tests show this pattern
- firewall requires `--from 'json(env://SECRETS_JSON)'`
- GitHub Actions `toJSON(secrets)` provides all secrets as JSON

**what if we didn't?**
- firewall wouldn't have secrets to process
- keys would remain locked/absent

**simpler way?**
- firewall could auto-detect secrets, but GitHub Actions security model requires explicit pass
- **verdict**: this is the required pattern

✅ **requirement holds**

---

### 4. "remove secrets declaration/env blocks from generated YAML"

**who said?** inferred — if firewall handles injection, blocks are redundant

**evidence?**
- firewall exports to `$GITHUB_ENV`
- workflow_call `secrets:` declaration is for secrets pass to reusable workflows
- but... wait.

⚠️ **question**: does the firewall run in the callee workflow (.test.yml)? if so, how do secrets get to it?

**answer**:
- caller workflow (test.yml) calls `.test.yml` with `secrets: inherit` or explicit secrets block
- callee workflow (.test.yml) receives secrets in its `secrets` context
- callee runs firewall step with `SECRETS_JSON: ${{ toJSON(secrets) }}`
- firewall exports to `$GITHUB_ENV` for subsequent steps

so we still need either:
- `secrets: inherit` in the caller
- OR explicit `secrets:` block in the caller

the **callee** (.test.yml) doesn't need `secrets:` declaration in workflow_call inputs if we use `secrets: inherit`.

⚠️ **refinement needed**: we may still need secrets blocks in caller workflows. the vision should clarify this.

---

### 5. scope question: is PR #344 actually merged?

**who said?** wish assumes it

**evidence?**
- i found acceptance tests in rhachet
- i found behavior docs
- but i didn't verify the merge status

⚠️ **must verify**: is PR #344 merged and released?

---

## summary

| requirement | status | notes |
|-------------|--------|-------|
| delete buildWorkflowSecretsBlock.ts | ✅ holds | dead code after firewall |
| simplify .test.yml.declapract.ts | ✅ holds with refinement | keep file, simplify logic |
| add firewall step to .test.yml | ✅ holds | required pattern |
| remove secrets blocks | ⚠️ needs refinement | caller may still need `secrets: inherit` |
| PR #344 merged | ⚠️ must verify | assumption, not validated |

## action items

1. verify PR #344 merge status
2. clarify secrets inheritance pattern in vision
3. update vision to reflect caller vs callee distinction
