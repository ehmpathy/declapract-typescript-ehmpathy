# self-review r1: has-complete-implementation-record

## the question

did I document all files that were implemented?

---

## git diff analysis

ran `git diff origin/main --name-status` to check all changes.

### files in my evaluation

| file | status | documented? |
|------|--------|-------------|
| jest.integration.env.ts | M | yes |
| jest.acceptance.env.ts | M | yes |
| package.json (tests) | M | yes |
| buildWorkflowSecretsBlock.ts | M | yes |
| .test.yml | M | yes |
| use.apikeys.sh (best-practice) | D | yes |
| use.apikeys.json (best-practice) | D | yes |
| use.apikeys.*.declapract.ts (best-practice) | D | yes |
| readUseApikeysConfig.ts | D | yes |
| bad-practice old-use-apikeys/* | A | yes |

### files absent from my evaluation

| file | status | why absent |
|------|--------|------------|
| withApikeysContext.ts | D | replaced by withKeyrackContext.ts - should have noted this |
| .test.yml.declapract.ts | M | workflow template changes - should have noted |
| .test.yml.declapract.test.ts | M | test updates - should have noted |
| publish.yml.declapract.test.ts | M | test update for buildWorkflowSecretsBlock import |
| deploy.yml.declapract.test.ts | M | test update for buildWorkflowSecretsBlock import |
| __snapshots__/*.snap | M | snapshot updates - should have noted |
| readUseApikeysConfig.declapract.test.ts | D | test file deleted - should have noted |

---

## issues found and fixes applied

### issue 1: withApikeysContext.ts deletion not documented

**what happened**: the old test fixture `withApikeysContext.ts` was replaced by `withKeyrackContext.ts`. my evaluation documented the addition but not the deletion.

**why this matters**: silent deletions can hide whether old code paths are truly removed. if the old fixture still existed, tests might still use it instead of the new one.

**fix applied**: added `[-] withApikeysContext.ts` to the filediff tree under `.test/infra/`.

**why the fix holds**: git diff confirms the file is deleted. no references to withApikeysContext remain in the codebase. the replacement fixture withKeyrackContext serves the same purpose with the new keyrack sdk.

---

### issue 2: workflow declapract file changes not documented

**what happened**: `.test.yml.declapract.ts` was modified to call `buildWorkflowSecretsBlock` which injects keyrack secrets into the workflow template.

**why this matters**: this is a core change - it's how the secrets block gets added to workflows dynamically based on keyrack.yml. without this change, declapract fix would not inject secrets.

**fix applied**: added `[~] .test.yml.declapract.ts` to the filediff tree with comment "inject keyrack secrets".

**why the fix holds**: the file imports buildWorkflowSecretsBlock and calls it in the fix function. this is verified by the extant test file `.test.yml.declapract.test.ts` which tests the secrets injection.

---

### issue 3: snapshot updates not documented

**what happened**: snapshot files were regenerated to reflect the new workflow output with prepare:rhachet step and keyrack secrets block.

**why this matters**: snapshots are part of the test suite. they document expected output and catch regressions. undocumented snapshot changes could hide unexpected output changes.

**fix applied**: added `[~] __snapshots__/*.snap` entries to the filediff tree.

**why the fix holds**: the snapshots match the current workflow templates. they were regenerated via RESNAP=true and committed. future changes to workflow output will be caught by snapshot diffs.

---

### issue 4: cross-workflow test updates not documented

**what happened**: `publish.yml.declapract.test.ts` and `deploy.yml.declapract.test.ts` were updated because they import the shared `withKeyrackContext` fixture.

**why this matters**: these imports changed from withApikeysContext to withKeyrackContext. if not documented, reviewer might miss that publish and deploy workflows are affected by this change.

**fix applied**: added entries for both files under their respective practice directories.

**why the fix holds**: the imports were updated to use withKeyrackContext. tests pass because the new fixture provides the same interface as the old one.

---

### issue 5: readUseApikeysConfig.declapract.test.ts deletion not documented

**what happened**: the test file for the deleted utility was also deleted.

**why this matters**: orphaned test files would cause confusion. the deletion confirms no test debt remains.

**fix applied**: added `[-] readUseApikeysConfig.declapract.test.ts` to the filediff tree.

**why the fix holds**: the utility is deleted, so its test file must also be deleted. git diff confirms both are gone.

---

## root cause

the evaluation focused on the blueprint's explicit file list without cross-reference to git diff. consequential changes (ripple effects from core changes) were not captured.

**lesson**: always run `git diff origin/main --name-status` as the source of truth for filediff tree, not the blueprint.

---

## why it holds now

the evaluation filediff tree now includes:
1. 7 additional files that were absent from the original evaluation
2. each file is categorized as added/modified/deleted
3. each file has a comment that explains its purpose

verification: ran `git diff origin/main --name-status | grep -E '^[AMD]' | grep -v '^A.*\.behavior/'` to filter behavior docs. all implementation files are now in the evaluation.
