# self-review r1: has-self-run-verification

## the question

dogfood check: did you run the playtest yourself?

---

## self-run results

### playtest.1: bad-practice files exist

**command equivalent**: `glob src/practices/cicd-common/bad-practices/old-use-apikeys/**/*`

**result**: 4 files found

```
use.apikeys.sh.declapract.ts
use.apikeys.sh.declapract.test.ts
use.apikeys.json.declapract.ts
use.apikeys.json.declapract.test.ts
```

**verdict**: pass

---

### playtest.2: keyrack.source() in jest env files

**command equivalent**: `grep -B5 'keyrack.source' src/practices/tests/best-practice/`

**result**: found in both files

| file | line | content |
|------|------|---------|
| jest.integration.env.ts | 97 | `keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'strict' });` |
| jest.acceptance.env.ts | 46 | `keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'strict' });` |

**verdict**: pass

---

### playtest.3: tests pass

**command**: `npm run test:unit -- src/practices/cicd-common/bad-practices/old-use-apikeys`

**result**:

```
PASS use.apikeys.sh.declapract.test.ts
  old-use-apikeys use.apikeys.sh
    ✓ should check for file existence
    ✓ should return null contents to delete the file

PASS use.apikeys.json.declapract.test.ts
  old-use-apikeys use.apikeys.json
    ✓ should check for file existence
    ✓ should return null contents to delete the file

Test Suites: 2 passed, 2 total
Tests:       4 passed, 4 total
```

**verdict**: pass

---

### playtest.4: use.apikeys files absent from best-practice

**command equivalent**: `glob src/practices/cicd-common/best-practice/.agent/repo=.this/role=any/skills/use.apikeys*`

**result**: no files found

**verdict**: pass

---

## summary

| playtest | result |
|----------|--------|
| playtest.1 | pass |
| playtest.2 | pass |
| playtest.3 | pass |
| playtest.4 | pass |

all 4 playtests pass. the behavior implementation is verified.

---

## why it holds

1. ran equivalent commands to all playtest steps
2. verified expected outputs match actual outputs
3. all tests pass
4. no issues found in self-run

