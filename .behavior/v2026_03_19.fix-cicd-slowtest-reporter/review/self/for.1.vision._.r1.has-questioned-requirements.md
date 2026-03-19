# self-review: has-questioned-requirements

## requirement 1: add slowtest reporter to jest.integration.config.ts

**who said this was needed?**
- the wish: "test-fns's latest version has a slowtest reporter for jest... we want to make that a best practice"

**what evidence supports this?**
- rhachet-roles-ehmpathy already uses it successfully
- test-fns exports the reporter since v1.15.0
- slow tests are a real problem in CI/CD pipelines

**what if we didn't do this?**
- slow tests would continue to accumulate silently
- no automated visibility into test performance
- developers would lack actionable feedback

**is the scope too large, too small, or misdirected?**
- scope is appropriate: integration tests only
- unit tests should be fast by nature (no reporter needed)
- acceptance tests are inherently slow (reporter would be noisy)

**could we achieve the goal in a simpler way?**
- no - this is already the simplest approach
- one line in jest config, one entry in gitignore

**verdict: holds** ✅

---

## requirement 2: add .slowtest/integration.report.json to .gitignore

**who said this was needed?**
- the wish: "make sure that the slowtest output file is added to .gitignore, just like it was in rhachet-roles-ehmpathy"

**what evidence supports this?**
- the reporter writes a json file to disk
- this file is machine-specific (test durations vary)
- it should not be committed

**what if we didn't do this?**
- accidental commits of local test duration data
- merge conflicts on json files
- git history pollution

**is the scope correct?**
- yes - matches exactly what rhachet-roles-ehmpathy does

**could we achieve the goal in a simpler way?**
- no - gitignore is the standard approach

**verdict: holds** ✅

---

## requirement 3: bump test-fns minVersion from 1.7.2 to 1.15.0

**who said this was needed?**
- derived from the fact that slowtest.reporter.jest export exists since 1.15.0

**what evidence supports this?**
- npm view test-fns shows the export added in 1.15.0
- current declapract requires 1.7.2 which lacks the export

**what if we didn't do this?**
- jest config would reference a non-existent export
- build would fail on repos with older test-fns

**is the scope correct?**
- yes - this is a necessary dependency

**could we achieve the goal in a simpler way?**
- no - the version bump is required

**verdict: holds** ✅

---

## requirement 4: 10s threshold

**who said this was needed?**
- copied from rhachet-roles-ehmpathy

**what evidence supports this?**
- rhachet-roles-ehmpathy uses 10s for integration tests
- seems reasonable for database/api calls

**what if we used a different threshold?**
- 5s: might flag too many tests
- 15s: might miss problematic tests
- 10s: reasonable middle ground

**is this the right choice?**
- question for wisher: is 10s the right threshold?
- acceptable because: users can override in their own config

**verdict: holds, but flagged as question** ⚠️

---

## requirement 5: integration tests only (not unit or acceptance)

**who said this was needed?**
- inferred from rhachet-roles-ehmpathy which only uses it for integration

**what evidence supports this?**
- unit tests: should be fast by definition (<1s ideally)
- acceptance tests: inherently slow (end-to-end)
- integration tests: where slow tests sneak in most often

**what if we added to all test types?**
- unit: would create noise, most are fast
- acceptance: would create noise, all are slow

**is this the right scope?**
- question for wisher: should we also add to acceptance tests?

**verdict: holds, but flagged as question** ⚠️

---

## summary

| requirement | verdict |
|-------------|---------|
| add slowtest reporter to jest.integration.config.ts | holds ✅ |
| add .slowtest/integration.report.json to .gitignore | holds ✅ |
| bump test-fns minVersion to 1.15.0 | holds ✅ |
| 10s threshold | holds, question for wisher ⚠️ |
| integration tests only | holds, question for wisher ⚠️ |

all requirements are justified. two items flagged for wisher input on configuration choices.
