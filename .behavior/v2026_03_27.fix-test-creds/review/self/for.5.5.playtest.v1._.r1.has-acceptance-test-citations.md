# self-review r1: has-acceptance-test-citations

## the question

cite the acceptance test for each playtest step.

---

## search for acceptance tests

```
glob: **/*.acceptance.test.ts
result: 0 files
```

this repo has no acceptance tests.

---

## why no acceptance tests?

this is a **declapract practice library**, not an application. it defines:
- best-practice templates
- bad-practice detection and fixes

the "acceptance" is:
1. unit tests verify check/fix functions
2. declapract engine applies fixes to consumer repos
3. consumer's acceptance tests verify behavior

---

## test coverage map

### playtest.1: bad-practice detection

| playtest step | test file | test case |
|---------------|-----------|-----------|
| step 1: 4 files exist | (structural) | directory has expected files |
| step 2: check = EXISTS | use.apikeys.sh.declapract.test.ts | "should check for file existence" |
| step 3: fix returns null | use.apikeys.sh.declapract.test.ts | "should return null contents to delete the file" |

### playtest.2: jest env keyrack.source

| playtest step | test file | test case |
|---------------|-----------|-----------|
| step 1: keyrack.source in integration.env | (no unit test) | file content verified by grep |
| step 2: keyrack.source in acceptance.env | (no unit test) | file content verified by grep |
| step 3: existence check guard | (no unit test) | file content verified by grep |

**why no unit tests for jest env files?**
- jest env files are templates, not functions
- declapract uses CONTAINS check for templates
- no custom check/fix logic to unit test

### playtest.3: tests pass

| playtest step | test file | test case |
|---------------|-----------|-----------|
| npm run test | (all tests) | entire test suite |

### playtest.4: old files removed

| playtest step | test file | test case |
|---------------|-----------|-----------|
| use.apikeys* absent | (structural) | files were removed |

---

## gaps identified

| gap | is this a problem? |
|-----|-------------------|
| no acceptance tests | no — this is a library, not an app |
| no unit tests for jest env files | no — templates verified by CONTAINS |
| playtest is the acceptance test | yes — this is intentional |

---

## why it holds

1. this is a declapract library, not an application
2. unit tests cover the check/fix function logic
3. jest env files are templates verified by CONTAINS
4. the playtest IS the human acceptance test
5. consumer repos have their own acceptance tests

