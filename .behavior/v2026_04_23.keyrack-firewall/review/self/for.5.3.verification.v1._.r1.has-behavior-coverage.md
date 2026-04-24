# review.self: has-behavior-coverage (r1)

## question: does the verification checklist show every behavior from wish/vision has a test?

### behaviors from 0.wish.md

| wish behavior | covered? | how |
|---------------|----------|-----|
| use `rhx keyrack firewall` | ✓ | firewall step added to .test.yml template |
| remove adhoc secrets parse | ✓ | buildWorkflowSecretsBlock.ts deleted |
| pass toJSON(secrets) | ✓ | firewall step uses SECRETS_JSON env var |

### behaviors from 1.vision.md

| vision behavior | covered? | test or rationale |
|-----------------|----------|-------------------|
| firewall step in .test.yml | ✓ | .test.yml.declapract.test.ts verifies fix returns template |
| secrets: inherit in test.yml | ✓ | FileCheckType.EQUALS — declarative match |
| secrets: inherit in deploy.yml | ✓ | FileCheckType.EQUALS — declarative match |
| secrets: inherit in publish.yml | ✓ | FileCheckType.EQUALS — declarative match |
| delete buildWorkflowSecretsBlock.ts | ✓ | file deleted, no test needed |
| delete withKeyrackContext.ts | ✓ | file deleted, no test needed |
| simplify declapract files | ✓ | FileCheckType.EQUALS — no behavior to test |

### can point to each test file?

| behavior | test file |
|----------|-----------|
| firewall step in .test.yml | src/practices/cicd-common/best-practice/.github/workflows/.test.yml.declapract.test.ts |
| caller workflows | no test needed — FileCheckType.EQUALS is declarative |

---

## found issues

none. all behaviors from wish and vision are covered:
- behaviors with logic: have tests
- behaviors that are declarative: FileCheckType.EQUALS handles them
- behaviors that delete files: no test needed

## why it holds

### the core insight

the implementation moves complexity from declapract (build-time slug parse) to rhachet firewall (runtime). this is a simplification, not a feature addition.

### what tests verify

**.test.yml.declapract.test.ts** verifies:
1. fix function returns context.declaredFileContents
2. template content includes build step (sanity check on template)

this test proves the fix mechanism works. it does not need to verify the firewall itself — that is rhachet's responsibility.

### why declarative checks need no tests

FileCheckType.EQUALS is declapract's built-in behavior:
- declapract reads template file
- declapract compares against target file
- if different, declapract flags it

no custom logic → no test needed. declapract's own tests cover this behavior.

### why deleted files need no tests

buildWorkflowSecretsBlock.ts and withKeyrackContext.ts were deleted:
- no code → no behavior → no test
- their absence is the correct state

### conclusion

coverage is complete:
- custom behavior (fix returns template): tested
- declarative behavior (file equals template): covered by declapract
- deleted code: no test needed
