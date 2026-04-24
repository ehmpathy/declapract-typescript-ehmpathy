# review.self: behavior-declaration-coverage (r5)

## deeper review for vision coverage

re-examined each changed file against the wish and vision:

---

### wish requirements (0.wish.md)

| requirement | status | evidence |
|-------------|--------|----------|
| use `rhx keyrack firewall` | ✓ | firewall step in .test.yml |
| remove adhoc secrets parse | ✓ | buildWorkflowSecretsBlock.ts deleted |
| pass toJSON(secrets) | ✓ | `SECRETS_JSON: ${{ toJSON(secrets) }}` |
| offload key filters | ✓ | firewall handles, not declapract |
| offload key sanitization | ✓ | firewall handles, not declapract |

---

### declapract file verification

**verified each simplified file uses FileCheckType.EQUALS**:

| file | check type | fix returns | status |
|------|------------|-------------|--------|
| .test.yml.declapract.ts | EQUALS | declaredFileContents | ✓ |
| test.yml.declapract.ts | EQUALS | declaredFileContents | ✓ |
| deploy.yml.declapract.ts | EQUALS | declaredFileContents | ✓ |
| publish.yml.declapract.ts | EQUALS | declaredFileContents | ✓ |

all four follow identical pattern — no slug parse logic remains.

---

### test file verification

**verified test file exists and tests the right behavior**:

| file | tests | status |
|------|-------|--------|
| .test.yml.declapract.test.ts | fix returns template content | ✓ exists |
| test.yml.declapract.test.ts | n/a | deleted (was for buildWorkflowSecretsBlock) |
| deploy.yml.declapract.test.ts | n/a | deleted (was for buildWorkflowSecretsBlock) |
| publish.yml.declapract.test.ts | n/a | deleted (was for buildWorkflowSecretsBlock) |

the .test.yml test remains because it validates the fix function. the caller workflow tests were deleted because they tested buildWorkflowSecretsBlock which no longer exists.

---

### vision scope verification

**"all workflow types that use keyrack secrets"**:

| workflow type | location | secrets: inherit | firewall | status |
|---------------|----------|------------------|----------|--------|
| test | cicd-common | ✓ test.yml | ✓ .test.yml | complete |
| deploy | cicd-service | ✓ deploy.yml | via .test.yml call | complete |
| publish | cicd-package | ✓ publish.yml | via .test.yml call | complete |
| deploy (expo) | cicd-app-react-native-expo | ✓ deploy.yml | via .test.yml call | complete |

**note**: only .test.yml has the firewall step because it's the callee workflow that runs tests. the caller workflows (test.yml, deploy.yml, publish.yml) pass secrets via `secrets: inherit`, and .test.yml applies the firewall.

---

## found issues

none. the implementation covers all requirements from both wish and vision:

1. **wish**: use firewall, remove adhoc parse, pass toJSON(secrets) ✓
2. **vision summary**: refactor/delete, simplify, update workflows, use secrets: inherit ✓
3. **scope**: all workflow types updated ✓
4. **tests**: .test.yml has test, deleted tests were for removed code ✓

## why it holds

re-verified each file against the requirements. the wish asks for firewall + remove adhoc parse. the vision details the implementation. all requirements are met.
