# review.self: has-preserved-test-intentions (r3)

## question: did you preserve test intentions?

### what tests were touched?

| file | action | what it tested before | what it tests now |
|------|--------|----------------------|-------------------|
| .test.yml.declapract.test.ts | modified | buildExpectedContent slug parse | fix returns template |
| test.yml.declapract.test.ts | deleted | slug parse + secrets block | n/a |
| deploy.yml.declapract.test.ts | deleted | slug parse + secrets block | n/a |
| publish.yml.declapract.test.ts | deleted | slug parse + secrets block | n/a |

### is this change in test intention justified?

**the behavior changed.**

before: declapract parsed keyrack slugs at build time, generated secrets blocks, and injected them into workflows.

after: declapract returns the template as-is. the firewall handles secrets at runtime.

**the old tests verified old behavior:**
- buildExpectedContent builds secrets block from keys
- secrets declaration is injected into workflow_call
- env block is injected into test job

**the new tests verify new behavior:**
- fix returns context.declaredFileContents
- template contains expected steps (sanity check)

### is this weakened assertion?

no. this is different behavior, not weakened verification.

| aspect | old test | new test |
|--------|----------|----------|
| what | verify slug parse + injection | verify fix returns template |
| strength | strict — checked specific injected content | strict — checks exact template return |
| coverage | buildExpectedContent function | fix function |

the old tests would fail on the new code because buildExpectedContent no longer exists. the new tests would fail on the old code because it returned transformed content, not template.

### why are deleted tests justified?

**test.yml.declapract.test.ts**, **deploy.yml.declapract.test.ts**, **publish.yml.declapract.test.ts**:

these tested slug parse + secrets block generation for caller workflows. that behavior was deleted.

the tests are not "skipped" or "weakened" — they tested functions that no longer exist.

---

## found issues

none.

## why it holds

### the intention changed, with justification

old intention: verify declapract injects secrets blocks based on keyrack slugs.
new intention: verify declapract returns template as-is.

this change is justified by the vision:
- "refactor buildWorkflowSecretsBlock.ts, simplify workflow declapract files"
- "use `secrets: inherit` in callers"

the complexity moved from declapract (build-time) to firewall (runtime).

### no assertions were weakened

the new tests are equally strict. they verify:
1. fix returns exactly context.declaredFileContents
2. template includes expected content

if fix returned a different value, the test would fail.

### conclusion

test intentions changed because behavior changed. the change is documented in the vision. the new tests verify the new behavior with equal strictness.
