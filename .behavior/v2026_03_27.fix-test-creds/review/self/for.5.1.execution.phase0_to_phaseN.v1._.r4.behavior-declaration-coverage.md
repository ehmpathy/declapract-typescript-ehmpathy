# self-review r4: behavior-declaration-coverage

## examination

walked through blueprint against code line by line.

### blueprint requirement 1: delete use.apikeys files from best-practice

**status:** DONE

files deleted:
- use.apikeys.sh
- use.apikeys.sh.declapract.ts
- use.apikeys.sh.declapract.test.ts
- use.apikeys.json
- use.apikeys.json.declapract.ts
- use.apikeys.json.declapract.test.ts

### blueprint requirement 2: update jest env files with keyrack.source()

**status:** DONE

- jest.integration.env.ts - keyrack.source() block added
- jest.acceptance.env.ts - keyrack.source() block added

### blueprint requirement 3: update package.json to remove test:auth

**status:** DONE

- test:auth command removed
- test command updated to not source apikeys

### blueprint requirement 4: create bad-practice old-use-apikeys

**status:** DONE

files created:
- use.apikeys.sh.declapract.ts
- use.apikeys.sh.declapract.test.ts
- use.apikeys.json.declapract.ts
- use.apikeys.json.declapract.test.ts

### blueprint requirement 5: update buildWorkflowSecretsBlock to use keyrack SDK

**status:** DONE

- readUseApikeysConfig deleted
- keyrack.get({ for: { repo: true }, env: 'test' }) used instead

### blueprint requirement 6: update .test.yml with prepare:rhachet step

**status:** ISSUE FOUND AND FIXED

**issue:** blueprint section 5 specified:
> add `prepare:rhachet` step to `test-shards-integration` and `test-shards-acceptance` jobs

this was NOT implemented in initial execution phases.

**fix applied:**
- added `npm run prepare:rhachet --if-present` step to test-shards-integration job
- added `npm run prepare:rhachet --if-present` step to test-shards-acceptance job

both steps added after "get node-modules from cache" step, before "get aws auth" step.

**verification:** `npm run test:unit -- .test.yml` passes (14 tests)

## verdict

all blueprint requirements now covered. one absent requirement found and fixed.
