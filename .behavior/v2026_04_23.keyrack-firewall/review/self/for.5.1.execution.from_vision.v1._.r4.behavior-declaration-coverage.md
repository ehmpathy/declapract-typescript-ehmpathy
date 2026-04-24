# review.self: behavior-declaration-coverage (r4)

## review for vision coverage

checked each requirement from the vision summary against the implementation:

---

### vision summary requirements (lines 229-238)

| # | requirement | implemented? | evidence |
|---|-------------|--------------|----------|
| 1 | refactor or delete `buildWorkflowSecretsBlock.ts` | ✓ deleted | no consumers remain |
| 2 | simplify workflow declapract files — remove slug parse logic | ✓ | 114 lines → 14 lines via FileCheckType.EQUALS |
| 3 | update `.test.yml`, `.deploy.yml`, etc. — add firewall step | ✓ | firewall in test-shards-integration and test-shards-acceptance |
| 4 | remove secrets declaration/env blocks, use `secrets: inherit` in callers | ✓ | test.yml, deploy.yml, publish.yml all have secrets: inherit |

---

### scope check: all workflow types

vision states: "all workflow types that use keyrack secrets (test.yml, deploy.yml, etc.)"

| workflow | location | updated? |
|----------|----------|----------|
| test.yml | cicd-common | ✓ secrets: inherit |
| deploy.yml | cicd-service | ✓ secrets: inherit |
| publish.yml | cicd-package | ✓ secrets: inherit |
| deploy.yml | cicd-app-react-native-expo | ✓ secrets: inherit |

---

### jobs with firewall step

vision states: "each job that needs secrets must run the firewall step"

| job | has firewall? | needs secrets? |
|-----|---------------|----------------|
| test-shards-integration | ✓ | ✓ runs integration tests |
| test-shards-acceptance | ✓ | ✓ runs acceptance tests |
| test-commits | ✗ | ✗ no secrets needed |
| test-types | ✗ | ✗ no secrets needed |
| test-format | ✗ | ✗ no secrets needed |
| test-lint | ✗ | ✗ no secrets needed |
| test-unit | ✗ | ✗ no secrets needed |

only jobs that run integration/acceptance tests need secrets. all other jobs are static analysis or unit tests without external dependencies.

---

### edgecases from vision (lines 158-163)

| edgecase | how handled | verified? |
|----------|-------------|-----------|
| project has no keyrack.yml | firewall no-op | ✓ firewall handles |
| key declared but not in secrets | status=locked | ✓ firewall handles |
| dangerous token in secrets | status=blocked, exit 2 | ✓ firewall handles |
| mechanism translation fails | status=locked | ✓ firewall handles |

all edgecases are handled by the firewall itself, not by declapract.

---

### deleted files

| file | reason |
|------|--------|
| buildWorkflowSecretsBlock.ts | no consumers after simplification |
| withKeyrackContext.ts | only used by deleted test files |
| test.yml.declapract.test.ts | tested buildWorkflowSecretsBlock |
| deploy.yml.declapract.test.ts | tested buildWorkflowSecretsBlock |
| publish.yml.declapract.test.ts | tested buildWorkflowSecretsBlock |
| 4 snapshot files | snapshots for deleted tests |

---

## found issues

none. all vision requirements are implemented:
1. buildWorkflowSecretsBlock.ts deleted (no consumers)
2. declapract files simplified to FileCheckType.EQUALS
3. firewall step added to jobs that need secrets
4. secrets: inherit added to all caller workflows

## why it holds

the implementation matches the vision summary point-by-point:
- refactor or delete → deleted
- simplify → FileCheckType.EQUALS
- update workflows → firewall in test jobs, secrets: inherit in callers
- edgecases → handled by firewall
