# self-review r2: has-divergence-analysis

## deeper examination

r1 listed divergences. r2 examines each with skepticism.

---

## the skeptical question

the blueprint is a contract. divergences from contracts are defects unless proven otherwise.

for each divergence, I must answer:
- is this truly a divergence or was it implicit in the blueprint?
- if it's a divergence, is it an enhancement or a violation?
- if it's an enhancement, does it exceed the scope of the behavior?

---

## divergence 1: withKeyrackContext.ts added (not in blueprint)

**the skeptic asks**: "the blueprint didn't mention this file. why did you create it?"

**examination**:
- the blueprint section "3. buildWorkflowSecretsBlock.ts" shows code that calls `keyrack.get()`
- the blueprint section "test coverage" doesn't specify how to test buildWorkflowSecretsBlock
- but the blueprint says "test file for buildWorkflowSecretsBlock" exists

**chain of reasoning**:
1. buildWorkflowSecretsBlock calls keyrack.get()
2. tests for buildWorkflowSecretsBlock need to control what keyrack.get() returns
3. the old withApikeysContext fixture mocked the old api
4. a new fixture is needed to mock the new api
5. therefore, withKeyrackContext is implied by the requirement to test buildWorkflowSecretsBlock

**conclusion**: implicit in blueprint. not a violation.

**why it holds**: you cannot test buildWorkflowSecretsBlock without a way to mock keyrack.get(). the fixture is the minimal mechanism to do so.

---

## divergence 2: withApikeysContext.ts deleted (not in blueprint)

**the skeptic asks**: "the blueprint said to delete use.apikeys files, not this fixture. why did you delete it?"

**examination**:
- withApikeysContext was used to test buildWorkflowSecretsBlock with the OLD api
- it mocked readUseApikeysConfig()
- readUseApikeysConfig.ts was deleted per blueprint
- withApikeysContext has no purpose without readUseApikeysConfig

**chain of reasoning**:
1. blueprint says delete readUseApikeysConfig.ts
2. withApikeysContext mocks readUseApikeysConfig
3. if readUseApikeysConfig is gone, withApikeysContext has no target to mock
4. dead code must be removed
5. therefore, deletion is implied by blueprint

**conclusion**: consequential deletion. not a violation.

**why it holds**: orphaned fixtures that mock deleted functions are dead code. dead code is always a defect.

---

## divergence 3: .test.yml.declapract.ts modified (not in blueprint)

**the skeptic asks**: "the blueprint mentions .test.yml but not .test.yml.declapract.ts. why did you modify it?"

**examination**:
- .test.yml is the template
- .test.yml.declapract.ts contains the check and fix functions
- the fix function must call buildWorkflowSecretsBlock to inject secrets

**chain of reasoning**:
1. blueprint says buildWorkflowSecretsBlock should inject secrets into workflows
2. .test.yml.declapract.ts is where fix() is defined for .test.yml
3. fix() must call buildWorkflowSecretsBlock to inject secrets
4. therefore, modification to .test.yml.declapract.ts is implied

**conclusion**: implicit in blueprint. not a violation.

**why it holds**: the fix function is the mechanism that applies best-practice changes. if the template should have secrets injected, the fix must call the injection function.

---

## divergence 4: cross-workflow test files modified

**the skeptic asks**: "why did publish.yml and deploy.yml tests change? the blueprint only mentions .test.yml"

**examination**:
- publish.yml.declapract.test.ts imports withKeyrackContext
- deploy.yml.declapract.test.ts imports withKeyrackContext
- both previously imported withApikeysContext

**chain of reasoning**:
1. withApikeysContext was deleted (divergence 2)
2. publish and deploy tests imported withApikeysContext
3. imports must be updated to withKeyrackContext or tests fail
4. test failures block the build
5. therefore, these changes are a prereq for the build to pass

**conclusion**: consequential changes. not a violation.

**why it holds**: you cannot delete a module that other modules import without update to the imports. this is basic dependency hygiene.

---

## divergence 5: snapshot files regenerated

**the skeptic asks**: "snapshots changed. what if they hide unintended changes?"

**examination**:
- snapshots capture workflow output
- workflow templates changed (added prepare:rhachet, secrets block)
- snapshots must reflect the new output

**chain of reasoning**:
1. .test.yml now has prepare:rhachet step
2. .test.yml now may have secrets block (via buildWorkflowSecretsBlock)
3. snapshots must match actual output
4. therefore, snapshot regeneration is required

**verification**: read the snapshot diff. it shows:
- prepare:rhachet step added in correct position (after cache restore, before build)
- secrets block added when keys are present

**conclusion**: necessary update. not a violation.

**why it holds**: snapshot tests exist to catch output changes. when we intentionally change output, we must update snapshots. the diffs show only the expected changes.

---

## divergence 6: readUseApikeysConfig.declapract.test.ts deleted

**the skeptic asks**: "the blueprint says delete readUseApikeysConfig.ts. does that include its test?"

**examination**:
- readUseApikeysConfig.ts was deleted per blueprint
- readUseApikeysConfig.declapract.test.ts tests the deleted file
- test has no target to test

**conclusion**: implicit in blueprint. dead test code.

**why it holds**: test files for deleted code are orphans. orphan tests are dead code.

---

## final assessment

| divergence | type | acceptable? | why |
|------------|------|-------------|-----|
| withKeyrackContext added | implicit | yes | required to test keyrack.get calls |
| withApikeysContext deleted | consequential | yes | orphaned by readUseApikeysConfig deletion |
| .test.yml.declapract.ts modified | implicit | yes | fix must call injection function |
| cross-workflow tests modified | consequential | yes | imports must track module renames |
| snapshots regenerated | necessary | yes | output changed, snapshots must match |
| readUseApikeysConfig test deleted | implicit | yes | orphaned by utility deletion |

**no violations found**. all divergences are:
- implicit requirements of the blueprint, or
- consequential effects of explicit blueprint items

---

## hostile reviewer check

**question**: "what if there are divergences you didn't notice?"

**method**: compare blueprint's file list against git diff line by line.

```
blueprint files:
  [-] use.apikeys.sh                    verified deleted
  [-] use.apikeys.json                  verified deleted
  [~] jest.integration.env.ts           verified modified
  [~] jest.acceptance.env.ts            verified modified
  [~] package.json                      verified modified
  [~] buildWorkflowSecretsBlock.ts      verified modified
  [~] .test.yml                         verified modified
  [-] readUseApikeysConfig.ts           verified deleted
  [+] bad-practice old-use-apikeys/*    verified created
```

**git diff additional files**:
```
  [-] withApikeysContext.ts             analyzed (divergence 2)
  [+] withKeyrackContext.ts             analyzed (divergence 1)
  [~] .test.yml.declapract.ts           analyzed (divergence 3)
  [~] .test.yml.declapract.test.ts      analyzed (divergence 4)
  [~] publish.yml.declapract.test.ts    analyzed (divergence 4)
  [~] deploy.yml.declapract.test.ts     analyzed (divergence 4)
  [~] __snapshots__/*.snap              analyzed (divergence 5)
  [-] readUseApikeysConfig.test.ts      analyzed (divergence 6)
```

all files accounted for. no unanalyzed divergences remain.

---

## why this review holds

1. examined each divergence with skepticism
2. traced chain of reasoning for why each is acceptable
3. classified each as implicit, consequential, or necessary
4. verified against git diff that no files are unaccounted
5. found no violations of blueprint intent