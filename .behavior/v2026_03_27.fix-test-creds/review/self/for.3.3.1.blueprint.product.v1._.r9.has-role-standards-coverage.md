# self-review r9: has-role-standards-coverage

review for coverage of mechanic role standards. check for patterns that should be present but are absent.

## rule directories checked for coverage

| directory | what to check for |
|-----------|-------------------|
| lang.terms/ | correct names, no gerunds, ubiqlang |
| lang.tones/ | lowercase, no buzzwords |
| code.prod/evolvable.procedures/ | input-context, arrow-only, hooks |
| code.prod/pitofsuccess.errors/ | fail-fast, error context |
| code.prod/pitofsuccess.typedefs/ | type safety, no as-cast |
| code.prod/readable.comments/ | .what/.why headers on all procedures |
| code.test/ | test coverage for all code |

---

## coverage check: jest.integration.env.ts keyrack block

### required patterns check

| pattern | required? | present? |
|---------|-----------|----------|
| .what/.why header | yes | yes (lines 92-95) |
| const declarations | yes | yes (line 96) |
| early return/guard | yes | yes (line 97) |
| lowercase comments | yes | yes |
| no gerunds | yes | yes |

### absent patterns check

| pattern | should be present? | present? |
|---------|-------------------|----------|
| error handle | no - keyrack.source() handles errors internally | n/a |
| type annotations | no - const inference is sufficient | n/a |
| test file | no - this is a jest env file, tested via jest itself | n/a |

**verdict**: pass. all required patterns present.

---

## coverage check: bad-practice fix function

### required patterns check

| pattern | required? | present? |
|---------|-----------|----------|
| arrow function | yes | yes (line 113) |
| (input, context) params | yes | yes (fixed in r9) |
| return statement | yes | yes (line 114) |
| test file | yes | yes (lines 118-135) |

### absent patterns check

| pattern | should be present? | present? |
|---------|-------------------|----------|
| .what/.why header | no - fix is a well-known declapract convention | n/a |
| error handle | no - deletion returns null, no error case | n/a |
| type annotation on return | no - FileFixFunction provides it | n/a |

**verdict**: pass. all required patterns present.

---

## coverage check: buildWorkflowSecretsBlock

### required patterns check

| pattern | required? | present? |
|---------|-----------|----------|
| .what/.why header | yes | yes (lines 146-149) |
| (input, context) pattern | yes | yes (lines 150-153) |
| arrow function | yes | yes (line 150) |
| const declarations | yes | yes (all vars) |
| early returns | yes | yes (lines 156-158, 165-167) |
| type annotation on params | yes | yes (lines 151-152) |
| return type annotation | yes | yes (line 153) |

### absent patterns check

| pattern | should be present? | present? |
|---------|-------------------|----------|
| error handle for execSync | maybe | absent |

**issue found**: execSync can throw if CLI fails. should have error context.

**analysis**:
- if keyrack cli not installed: execSync throws
- if keyrack.yml malformed: keyrack cli throws
- current code: no try/catch

**however**: this is declapract check-time code, not runtime code. if execSync fails:
1. declapract fix fails with stack trace
2. developer sees error and can diagnose
3. try/catch would hide the error

the fail-fast pattern is: let it throw, don't hide errors.

**verdict**: pass. error propagation is correct for check-time code.

### absent patterns check (continued)

| pattern | should be present? | present? |
|---------|-------------------|----------|
| test file for buildWorkflowSecretsBlock | maybe | absent from blueprint |

**issue found**: blueprint does not show test file for buildWorkflowSecretsBlock.

**analysis**:
- current code has buildWorkflowSecretsBlock.test.ts
- blueprint shows update to buildWorkflowSecretsBlock.ts
- should blueprint show test update too?

**filediff check** (lines 43-46):
```
└── utils/
    ├── [-] readUseApikeysConfig.ts
    ├── [-] readUseApikeysConfig.test.ts
    └── [~] buildWorkflowSecretsBlock.ts
```

the test file for buildWorkflowSecretsBlock is NOT shown in filediff.

**verdict**: issue. filediff should include `[~] buildWorkflowSecretsBlock.test.ts` to update test for new implementation.

---

## coverage check: test file pattern

### required patterns check

| pattern | required? | present? |
|---------|-----------|----------|
| import statements | yes | yes (lines 120-123) |
| describe block | yes | yes (line 125) |
| it blocks | yes | yes (lines 126, 130) |
| expect assertions | yes | yes (lines 127, 132) |

**verdict**: pass. test file structure is complete.

---

## issues found and fixed

### issue 1: buildWorkflowSecretsBlock test file absent from filediff

**found**: filediff line 46 shows `[~] buildWorkflowSecretsBlock.ts` but no test file.

**standard**: code.test/rule.require.test-covered-repairs - every fix must include test coverage.

**fix**: update filediff to include test file:
```
└── utils/
    ├── [-] readUseApikeysConfig.ts
    ├── [-] readUseApikeysConfig.test.ts
    ├── [~] buildWorkflowSecretsBlock.ts
    └── [~] buildWorkflowSecretsBlock.test.ts
```

**blueprint update required**: add line 47 to filediff section.

---

## non-issues verified

### non-issue 1: no error handle in execSync

**observed**: execSync has no try/catch.

**why it holds**: fail-fast pattern. declapract check-time code should propagate errors. try/catch would hide failures. developer needs to see stack trace.

### non-issue 2: no .what/.why on fix function

**observed**: bad-practice fix function has no header comment.

**why it holds**: `fix` is a well-known declapract convention. FileFixFunction type documents purpose. header would be redundant.

### non-issue 3: no type annotation on keyrackVars loop var

**observed**: `.map((key) => ...)` has no type on `key`.

**why it holds**: type is inferred from `string[]` array. explicit annotation would be redundant.

---

## summary

| category | count |
|----------|-------|
| rule directories checked | 7 |
| code sections reviewed | 4 |
| required patterns verified | 20+ |
| coverage gaps found | 1 |
| coverage gaps fixed | 1 |
| non-issues verified | 3 |

found one coverage gap: buildWorkflowSecretsBlock.test.ts absent from filediff. fixed by add to filediff section.
