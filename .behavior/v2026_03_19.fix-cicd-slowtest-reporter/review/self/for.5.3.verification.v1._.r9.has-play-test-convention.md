# self-review r9: has-play-test-convention

## the question

are journey test files named correctly with `.play.test.ts` suffix?

---

## journey test inventory

### what test files were added or modified?

| file | type | added/modified? |
|------|------|-----------------|
| .gitignore.declapract.test.ts | unit test | modified |
| .declapract.integration.test.ts | integration test | not modified |

### are these journey tests?

| test file | is it a journey test? | reason |
|-----------|----------------------|--------|
| .gitignore.declapract.test.ts | no | unit test for check/fix logic |
| .declapract.integration.test.ts | no | integration test for declapract apply |

**no journey tests were added by this feature.**

---

## what is a journey test?

### definition

a journey test simulates a user's end-to-end experience:
- starts from user intent
- walks through multiple steps
- validates the complete flow

### examples of journey tests

| journey | test name |
|---------|-----------|
| user registers account | register-account.play.test.ts |
| user creates invoice | create-invoice.play.test.ts |
| developer runs declapract apply | declapract-apply.play.test.ts |

### why this feature has no journey tests

| reason | explanation |
|--------|-------------|
| feature is config | no user journey to test |
| behavior is automatic | reporter runs without user action |
| validation is indirect | tests validate config, not journey |

---

## extant test analysis

### .gitignore.declapract.test.ts

```ts
describe('.gitignore best practice', () => {
  describe('check', () => {
    it('should pass when all expected ignores are present', ...);
    it('should fail when node_modules negation patterns are absent', ...);
  });
  describe('fix', () => {
    it('should create file with all ignores', ...);
    it('should add node_modules negations', ...);
    // ...
  });
});
```

| aspect | value |
|--------|-------|
| type | unit test |
| suffix | `.test.ts` |
| tests what | check/fix functions |
| journey? | no — tests functions, not user flow |

### should this be a journey test?

| question | answer |
|----------|--------|
| does it simulate user experience? | no — tests function logic |
| does it walk through multiple steps? | no — tests single function |
| does it validate complete flow? | no — tests isolated behavior |

**this is correctly a unit test, not a journey test.**

---

## when would this feature need journey tests?

### hypothetical: if this were a cli command

if slowtest reporter were a standalone cli command:

```bash
npx slowtest run --threshold 10s
```

then we would need:

```ts
// slowtest-run.play.test.ts
describe('slowtest run', () => {
  given('[case1] project with slow tests', () => {
    when('[t0] user runs command', () => {
      then('report shows slow tests', ...);
    });
  });
});
```

### why this is not the case

| aspect | this feature | cli command |
|--------|--------------|-------------|
| invoked by | jest (automatic) | user (explicit) |
| user action | none | runs command |
| journey | none | user → command → output |

**no journey because no explicit user action.**

---

## repo convention check

### does this repo use .play.test.ts?

```bash
find src/ -name '*.play.test.ts'
# result: no matches
```

this repo does not use the `.play.` suffix convention.

### what suffix does this repo use?

| suffix | purpose | example |
|--------|---------|---------|
| `.test.ts` | unit tests | .gitignore.declapract.test.ts |
| `.integration.test.ts` | integration tests | .declapract.integration.test.ts |
| `.acceptance.test.ts` | acceptance tests | (not present) |

### is this a problem?

| question | answer |
|----------|--------|
| does this feature add journey tests? | no |
| if it did, what suffix would we use? | .play.test.ts or fallback to .integration.test.ts |
| is there a gap? | no — no journey tests needed |

---

## counter-argument: should we add a journey test?

### argument

> "we could add a journey test that simulates: user runs tests → sees slowtest report"

### analysis

| step | testable? | how? |
|------|-----------|------|
| user runs tests | yes | spawn jest process |
| tests execute | yes | check exit code |
| report appears | yes | check stdout |
| user reads report | no | requires human |

### verdict

| approach | value | cost |
|----------|-------|------|
| journey test | moderate | high (process spawn, output capture) |
| integration test | high | low (declapract apply) |
| unit test | high | low (check/fix logic) |

**integration test is sufficient** — it validates the config is applied correctly.

---

## conclusion

no journey tests to validate:

1. **no journey tests added** — feature is config, not user flow
2. **no journey tests needed** — behavior is automatic, no user action
3. **repo does not use .play. suffix** — but would if needed
4. **extant tests are sufficient** — unit + integration cover behavior

this review is n/a — no journey tests exist because no journeys exist.

the feature adds config that jest consumes automatically. the user's "journey" is:
- run tests (habit)
- see report (automatic)

no explicit journey to test. validation happens via config check (unit) and apply (integration).

