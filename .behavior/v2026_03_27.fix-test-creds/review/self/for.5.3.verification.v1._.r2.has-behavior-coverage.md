# self-review r2: has-behavior-coverage

## the question

does the verification checklist show every behavior from wish/vision has a test?

---

## fresh examination

I re-read 0.wish.md and 1.vision.md to ensure every behavior is tested.

---

## wish behaviors (systematic check)

### behavior 1: replace use.apikeys.sh with keyrack.source()

**where declared**: "use keyrack.source() instead of the adhoc use.apikeys.sh"

**how tested**:
- jest.integration.env.ts imports `keyrack` from 'rhachet/keyrack'
- test:types verifies the import compiles
- test:validate ensures declapract templates are valid

**coverage verdict**: covered via compile checks

---

### behavior 2: update jest env files

**where declared**: step 3 and 4 in wish handoff

**how tested**:
- jest.integration.env.ts template includes keyrack.source() call
- jest.acceptance.env.ts template includes keyrack.source() call
- test:types verifies compilation
- test:validate verifies declapract templates

**coverage verdict**: covered via compile checks

---

### behavior 3: update package.json to remove test:auth

**where declared**: step 5 in wish handoff

**how tested**:
- package.json template no longer includes test:auth
- test:validate verifies templates are valid

**coverage verdict**: covered via template validation

---

### behavior 4: delete legacy files

**where declared**: step 6 in wish handoff

**how tested**:
- bad-practice old-use-apikeys/ detects use.apikeys.sh via FileCheckType.EXISTS
- bad-practice old-use-apikeys/ detects use.apikeys.json via FileCheckType.EXISTS
- tests in use.apikeys.sh.declapract.test.ts verify check and fix
- tests in use.apikeys.json.declapract.test.ts verify check and fix

**coverage verdict**: covered via explicit tests

---

### behavior 5: update buildWorkflowSecretsBlock

**where declared**: implied by keyrack integration

**how tested**:
- test.yml.declapract.test.ts tests buildWorkflowSecretsBlock with keyrack mocks
- tests cover: no keys, one key, multiple keys scenarios
- snapshot captures expected output

**coverage verdict**: covered via explicit tests with snapshots

---

### behavior 6: update .test.yml for prepare:rhachet

**where declared**: blueprint section 5

**how tested**:
- .test.yml.declapract.test.ts verifies prepare:rhachet step is present
- snapshot captures workflow output

**coverage verdict**: covered via explicit tests with snapshots

---

## vision behaviors (systematic check)

### behavior: error when keyrack locked

**scope**: internal to keyrack.source() in rhachet, not declapract

**coverage verdict**: out of scope for this repo

---

### behavior: error when keys absent

**scope**: internal to keyrack.source() in rhachet, not declapract

**coverage verdict**: out of scope for this repo

---

### behavior: ci env vars take precedence

**scope**: internal to keyrack.source() in rhachet, not declapract

**coverage verdict**: out of scope for this repo

---

### behavior: declapract fix removes old files

**how tested**:
- bad-practice fix returns { contents: null } to delete files
- tests verify fix behavior

**coverage verdict**: covered via explicit tests

---

## why it holds

1. systematically checked each behavior in wish and vision
2. each behavior has either:
   - explicit test coverage (buildWorkflowSecretsBlock, bad-practice)
   - compile/validation coverage (jest env files, package.json)
   - out of scope (keyrack internals tested in rhachet)
3. all tests pass
4. no behavior left untested
