# self-review r2: has-divergence-addressed

## the question

did I address each divergence properly? for each:
- if repaired: is the fix visible in git?
- if backed up: does the rationale convince a skeptic?

---

## divergences classified

all 6 divergences were classified as "backed up" (not repaired):

| divergence | classification | rationale |
|------------|----------------|-----------|
| withKeyrackContext added | implicit | test fixture needed for keyrack.get mocks |
| withApikeysContext deleted | consequential | orphaned by readUseApikeysConfig deletion |
| .test.yml.declapract.ts modified | implicit | fix function must call injection |
| cross-workflow tests modified | consequential | imports must track renames |
| snapshots regenerated | necessary | output changed |
| readUseApikeysConfig test deleted | implicit | orphaned by utility deletion |

---

## skeptical examination of each backup

### backup 1: withKeyrackContext added

**skeptic asks**: "is this truly necessary, or could you have tested without a fixture?"

**answer**: no. buildWorkflowSecretsBlock calls keyrack.get(). without a mock, tests would require:
- real keyrack credentials
- real keyrack daemon active
- network access

this would make tests flaky and environment-dependent. the fixture isolates the unit under test.

**is this laziness?**: no. this is dependency injection for testability. the blueprint didn't mention the fixture because it's infrastructure, not product code.

**could this cause problems later?**: the fixture could drift from the real keyrack.get() behavior. mitigated by:
- fixture mimics real KeyrackGrantAttempt shapes
- integration tests (which use real keyrack) catch drift

**verdict**: strong rationale. not laziness.

---

### backup 2: withApikeysContext deleted

**skeptic asks**: "maybe you should have kept it for backwards compatibility?"

**answer**: no. withApikeysContext mocked readUseApikeysConfig(). that function is deleted. the mock has no target. to keep it would be dead code.

**is this laziness?**: the opposite. to delete dead code takes effort (find imports, update them).

**could this cause problems later?**: only if we resurrect readUseApikeysConfig. but that would contradict the blueprint's entire intent.

**verdict**: strong rationale. correct cleanup.

---

### backup 3: .test.yml.declapract.ts modified

**skeptic asks**: "the blueprint didn't mention this file. are you sure it needs to change?"

**answer**: yes. the blueprint says "buildWorkflowSecretsBlock builds workflow content with keyrack secrets". the only place that can call buildWorkflowSecretsBlock is the fix() function in .test.yml.declapract.ts. if fix() doesn't call it, secrets never get injected.

**is this laziness?**: no. this is the core wire-up. without this change, the feature doesn't work.

**could this cause problems later?**: the regex in buildWorkflowSecretsBlock could fail on edge cases. mitigated by:
- snapshot tests verify output
- tests cover 0, 1, and N keys

**verdict**: strong rationale. core implementation.

---

### backup 4: cross-workflow tests modified

**skeptic asks**: "why did publish and deploy tests change? this is scope creep."

**answer**: these tests imported withApikeysContext. that file was deleted. typescript compilation would fail. this is not scope creep; it's transitive dependency update.

**is this laziness?**: no. the alternative was to break the build.

**could this cause problems later?**: no. the import path changed; the behavior is identical.

**verdict**: strong rationale. necessary for build.

---

### backup 5: snapshots regenerated

**skeptic asks**: "how do I know the snapshots don't hide unintended changes?"

**answer**: read the snapshot diffs:
1. prepare:rhachet step appears after cache restore, before build - correct per blueprint
2. secrets block appears after with: block - correct per buildWorkflowSecretsBlock regex

no other changes in snapshots. verified by visual inspection.

**is this laziness?**: no. snapshots must match actual output. RESNAP=true is the correct way to update them.

**could this cause problems later?**: only if we stop reading snapshot diffs in PRs.

**verdict**: strong rationale. diffs verified.

---

### backup 6: readUseApikeysConfig test deleted

**skeptic asks**: "why delete the test? shouldn't tests be preserved?"

**answer**: tests verify behavior. readUseApikeysConfig.ts is deleted. there is no behavior to verify. the test would fail to compile (import not found).

**is this laziness?**: no. orphan tests are defects.

**could this cause problems later?**: only if we resurrect the utility and forget to write tests. but resurrection contradicts blueprint.

**verdict**: strong rationale. correct cleanup.

---

## summary

| divergence | laziness? | strong rationale? | future risk? |
|------------|-----------|-------------------|--------------|
| withKeyrackContext added | no | yes | mitigated |
| withApikeysContext deleted | no | yes | none |
| .test.yml.declapract.ts modified | no | yes | mitigated |
| cross-workflow tests modified | no | yes | none |
| snapshots regenerated | no | yes | minimal |
| readUseApikeysConfig test deleted | no | yes | none |

all backups have strong rationales. none are laziness. future risks are minimal or mitigated.

---

## why this review holds

1. examined each backup skeptically
2. answered "is this laziness?" for each - all no
3. answered "could this cause problems?" for each - risks are mitigated
4. no divergences require repair - all are justified by transitive dependencies or infrastructure requirements