# review.self: has-all-tests-passed (r2)

## proof of test execution

### types

```
$ npm run test:types
> tsc -p ./tsconfig.json --noEmit
(no output = success)
> exit 0
```

### lint

```
$ npm run test:lint
> npm run test:lint:biome && npm run test:lint:deps
> Checked 201 files in 157ms. No fixes applied.
> No depcheck issue
> exit 0
```

### format

```
$ npm run test:format
> npm run test:format:biome
> Checked 201 files in 39ms. No fixes applied.
> exit 0
```

### unit tests

```
$ THOROUGH=true npm run test:unit
> jest -c ./jest.unit.config.ts ...
> Test Suites: 49 passed, 49 total
> Tests:       264 passed, 264 total
> Snapshots:   13 passed, 13 total
> Time:        1.536 s
> exit 0
```

### integration tests

```
$ npm run test:integration
> jest -c ./jest.integration.config.ts ...
> No tests found related to files changed since "main".
> exit 0
```

no integration tests were affected by this PR.

### acceptance tests

```
$ npm run test:acceptance:locally
> npm run build && LOCALLY=true jest -c ./jest.acceptance.config.ts ...
> 📝 compiled 433 files
> No tests found, exit code 0
> exit 0
```

acceptance tests are not present in this repo (declapract-typescript-ehmpathy is a practices definition, not a service).

---

## found issues

none. all tests pass.

## why it holds

### what passed

| suite | count | result |
|-------|-------|--------|
| types | n/a | no errors |
| lint | 201 files | no issues |
| format | 201 files | no issues |
| unit | 264 tests | all passed |
| integration | 0 tests | none affected by changes |
| acceptance | 0 tests | none in this repo |

### zero extant failures

no prior failures exist. all 264 unit tests pass. the test suite is green.

### zero credential issues

no tests require credentials. the tests are pure unit tests that verify fix returns template contents.

### zero fake tests

the kept test (.test.yml.declapract.test.ts) verifies:
1. fix returns context.declaredFileContents
2. template includes build step

both assertions verify real behavior against real code.

### conclusion

all test suites pass with exit code 0. proof cited for each command run.
