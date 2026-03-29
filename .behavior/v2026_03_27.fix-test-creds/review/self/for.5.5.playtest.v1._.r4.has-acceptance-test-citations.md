# self-review r4: has-acceptance-test-citations

## the question

cite the acceptance test for each playtest step.

---

## synthesis from r1-r3

| round | focus | conclusion |
|-------|-------|------------|
| r1 | search for acceptance tests | 0 found — this is a library |
| r2 | cite unit tests | exact file paths and line numbers cited |
| r3 | are unit tests sufficient? | yes — contracts verified by declapract |

---

## final citation matrix

### playtest.1: bad-practice detection

| step | test file | test case | line |
|------|-----------|-----------|------|
| step 2: check = EXISTS | use.apikeys.sh.declapract.test.ts | "should check for file existence" | 6-8 |
| step 3: fix returns null | use.apikeys.sh.declapract.test.ts | "should return null contents to delete the file" | 10-13 |
| (same for .json) | use.apikeys.json.declapract.test.ts | identical tests | 6-8, 10-13 |

### playtest.2: jest env files

| step | test type | why no unit test |
|------|-----------|------------------|
| step 1: keyrack.source | playtest | template verified via grep |
| step 2: keyrack.source | playtest | template verified via grep |
| step 3: existence guard | playtest | template verified via grep |

### playtest.3: tests pass

| step | test type | coverage |
|------|-----------|----------|
| npm run test | all tests | runs entire suite |

### playtest.4: files absent

| step | test type | why no unit test |
|------|-----------|------------------|
| use.apikeys* absent | structural | git tracks file presence |

---

## the deeper truth

this behavior adds:
1. bad-practice check/fix (unit tested)
2. best-practice templates (verified by declapract CONTAINS)
3. file removal (structural, tracked by git)

the playtest IS the acceptance test because:
- unit tests prove logic
- playtest proves integration
- no end-to-end application flow exists to test

---

## why it holds

1. all testable behaviors have unit test citations
2. all structural behaviors are verified by playtest
3. playtest serves as acceptance layer for this library
4. no gaps require new tests

