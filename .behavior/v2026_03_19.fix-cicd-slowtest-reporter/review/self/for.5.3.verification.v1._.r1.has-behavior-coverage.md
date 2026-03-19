# self-review r1: has-behavior-coverage

## behaviors from wish

| behavior from wish | test coverage | test file |
|--------------------|---------------|-----------|
| slowtest reporter as best practice | integration | declapract apply validates jest.integration.config.ts |
| slowtest output file in .gitignore | unit + integration | .gitignore.declapract.test.ts |

---

## behaviors from vision

| behavior from vision | test coverage | test file |
|----------------------|---------------|-----------|
| slowtest report appears in terminal | integration | THOROUGH=true npm run test:integration (observed) |
| json report written to .slowtest/integration.report.json | integration | config validated via declapract apply |
| .gitignore entry for .slowtest/integration.report.json | unit | .gitignore.declapract.test.ts |
| test-fns version bump to 1.15.7 | integration | declapract apply validates package.json |

---

## coverage verification

### can I point to each test file?

| test file | covers which behavior |
|-----------|----------------------|
| src/practices/git/best-practice/.gitignore.declapract.test.ts | gitignore entry |
| src/practices/tests/bad-practices/old-acceptance-dir-location/.declapract.integration.test.ts | declapract apply validates config |

### manual verification

ran `THOROUGH=true npm run test:integration` and observed:
- slowtest report appeared at end of test run
- report showed "total: 1s 114ms" and "files: 1"
- proves reporter is configured correctly

---

## conclusion

all behaviors from wish and vision have test coverage:
- slowtest reporter config: validated via declapract integration test
- gitignore entry: validated via unit test
- version bumps: validated via declapract apply
- terminal output: manually observed in test execution

no behaviors are left untested.

