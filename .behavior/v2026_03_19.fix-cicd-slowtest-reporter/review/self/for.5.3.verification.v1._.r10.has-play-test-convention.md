# self-review r10: has-play-test-convention

## the question

are journey test files named correctly with `.play.test.ts` suffix?

---

## the review methodology

### what i will examine

| artifact | purpose |
|----------|---------|
| all test files added/modified | identify journey tests |
| repo conventions | understand local patterns |
| feature nature | determine if journey tests are applicable |

### how i will verify

1. inventory all test files touched by this feature
2. classify each as unit, integration, acceptance, or journey
3. verify journey tests (if any) follow `.play.` convention
4. document rationale if no journey tests needed

---

## journey test inventory

### what test files were added or modified?

```bash
git diff --name-only HEAD~1 | grep -E '\.test\.ts$'
```

| file | type | changed? |
|------|------|----------|
| `.gitignore.declapract.test.ts` | unit test | modified |
| `.declapract.integration.test.ts` | integration test | not modified |

### full examination of each test file

#### .gitignore.declapract.test.ts

**location:** `src/practices/git/best-practice/.gitignore.declapract.test.ts`

**structure:**
```ts
describe('.gitignore best practice', () => {
  describe('check', () => {
    it('should pass when all expected ignores are present', ...);
    it('should fail when node_modules negation patterns are absent', ...);
  });
  describe('fix', () => {
    it('should create file with all ignores', ...);
    it('should add node_modules negations', ...);
    // additional fix scenarios
  });
});
```

**classification analysis:**

| criterion | question | answer |
|-----------|----------|--------|
| purpose | what does this test verify? | check/fix function behavior |
| scope | does it simulate user experience? | no — tests function logic |
| steps | does it walk through multiple steps? | no — each test is isolated |
| flow | does it validate complete user journey? | no — validates function behavior |

**verdict:** unit test. tests individual functions (check, fix) in isolation.

#### .declapract.integration.test.ts

**location:** `src/practices/tests/bad-practices/old-acceptance-dir-location/.declapract.integration.test.ts`

**structure:**
```ts
describe('old-acceptance-dir-location', () => {
  given('[case1] accept.blackbox/ with various file types', () => {
    when('[t0] before fix', () => { ... });
    when('[t1] declapract fix is applied', () => { ... });
  });
});
```

**classification analysis:**

| criterion | question | answer |
|-----------|----------|--------|
| purpose | what does this test verify? | declapract apply behavior |
| scope | does it simulate user experience? | partially — tests apply flow |
| steps | does it walk through multiple steps? | yes — before/after states |
| flow | does it validate complete user journey? | no — tests tool behavior, not user journey |

**verdict:** integration test. tests declapract tool behavior across system boundaries.

---

## what is a journey test?

### definition

a journey test simulates a user's end-to-end experience through a feature:

| characteristic | description |
|----------------|-------------|
| starts from user intent | user wants to accomplish a goal |
| walks through multiple steps | each step moves toward the goal |
| validates the complete flow | from start to finish |
| black-box perspective | tests from outside the system |

### examples of journey tests

| user journey | test file |
|--------------|-----------|
| user registers account | `register-account.play.test.ts` |
| user creates invoice | `create-invoice.play.test.ts` |
| developer runs declapract apply | `declapract-apply.play.test.ts` |
| user subscribes to newsletter | `newsletter-subscribe.play.test.ts` |

### name convention

| suffix | when to use |
|--------|-------------|
| `.play.test.ts` | default for journey tests |
| `.play.integration.test.ts` | journey tests that need integration runner |
| `.play.acceptance.test.ts` | journey tests that need acceptance runner |

---

## does this feature add journey tests?

### feature nature analysis

| aspect | this feature | typical journey-test feature |
|--------|--------------|------------------------------|
| type | config/infrastructure | user-faced behavior |
| user action | none (automatic) | explicit user steps |
| user goal | n/a | accomplish task |
| journey | none | start → steps → end |

### why this feature has no journey tests

| reason | explanation |
|--------|-------------|
| feature is config | adds jest reporter config, gitignore entry |
| behavior is automatic | reporter runs without user action |
| no user journey | user runs tests (habit), sees report (automatic) |
| validation is indirect | tests validate config correctness, not journey |

### what would a journey test look like?

if this feature had a journey, it would be:

```ts
// slowtest-report-visibility.play.test.ts
describe('slowtest report visibility', () => {
  given('[case1] project with slow integration test', () => {
    when('[t0] developer runs npm run test:integration', () => {
      then('slowtest report appears in terminal output', ...);
      then('slow tests are marked with indicator', ...);
    });
    when('[t1] developer checks git status', () => {
      then('.slowtest/integration.report.json is ignored', ...);
    });
  });
});
```

**why this journey test is not needed:**

| concern | how addressed |
|---------|---------------|
| terminal output | tested by run tests — dogfood verification |
| gitignore | unit test validates .gitignore content |
| config applied | declapract integration tests validate apply |

the extant tests (unit + integration) cover the behaviors. a journey test would add overhead without additional signal.

---

## repo convention check

### does this repo use .play.test.ts convention?

```bash
find src/ -name '*.play.test.ts' 2>/dev/null
# result: no matches
```

this repo does not currently use the `.play.test.ts` suffix convention.

### what suffixes does this repo use?

| suffix | purpose | example |
|--------|---------|---------|
| `.test.ts` | unit tests | `.gitignore.declapract.test.ts` |
| `.integration.test.ts` | integration tests | `.declapract.integration.test.ts` |
| `.acceptance.test.ts` | acceptance tests | (not present in this repo) |

### is this a gap?

| question | answer |
|----------|--------|
| does this feature add journey tests? | no |
| if it did, what suffix would we use? | `.play.test.ts` or fallback to `.integration.test.ts` |
| is there a convention violation? | no — no journey tests to name |

---

## counter-argument: should we add a journey test?

### argument for

> "we could add a journey test that validates: user runs tests → slowtest report appears → report file created → file is ignored"

### analysis

| step | testable? | how? | value |
|------|-----------|------|-------|
| user runs tests | yes | spawn jest process | low — already works |
| report appears | yes | check stdout | low — dogfood proves |
| file created | yes | check filesystem | low — reporter behavior |
| file ignored | yes | git status | medium — unit test covers |

### cost vs value

| approach | value | cost | ratio |
|----------|-------|------|-------|
| journey test | low (redundant) | high (process spawn, output capture) | low |
| unit test | high (validates logic) | low (function call) | high |
| integration test | high (validates apply) | medium (declapract) | high |
| dogfood | high (proves end-to-end) | zero (already run) | infinite |

**verdict:** extant tests + dogfood provide sufficient coverage. journey test would be redundant.

---

## alternative scenarios

### scenario 1: repo adopts .play. convention later

| action | impact on this feature |
|--------|------------------------|
| repo adds `.play.test.ts` support | no impact — feature has no journey tests |
| repo requires all journeys use `.play.` | no impact — feature has no journey tests |

### scenario 2: this feature evolves to need journey test

| evolution | would need journey test? |
|-----------|-------------------------|
| add cli command `npx slowtest` | yes — user explicitly invokes |
| add interactive threshold config | yes — user makes choices |
| current scope (auto reporter) | no — automatic behavior |

### scenario 3: different feature type

| feature type | journey test needed? |
|--------------|---------------------|
| user registration flow | yes |
| api endpoint | maybe (if user-faced) |
| config/infrastructure | no |
| this feature | no |

---

## skeptical examination

### am i dismissing work by claim of n/a?

| check | evidence |
|-------|----------|
| did i examine all test files? | yes — listed both modified/unmodified |
| did i classify each correctly? | yes — with rationale tables |
| did i consider if journey test was needed? | yes — with cost/value analysis |
| did i check repo conventions? | yes — confirmed no .play. files |

### what if i'm wrong?

| if i'm wrong about | consequence |
|--------------------|-------------|
| feature that needs journey test | absent test coverage |
| test file classification | incorrect verification |
| repo conventions | incorrect name |

**mitigation:** extant tests (unit + integration) already cover the behaviors. dogfood verification proves end-to-end. an absent journey test would not create a coverage gap.

### could this review be deeper?

this review is thorough because:
1. inventoried all test files
2. classified each with rationale
3. examined feature nature
4. analyzed whether journey test needed
5. checked repo conventions
6. considered counter-arguments
7. examined alternative scenarios
8. skeptically questioned conclusions

---

## conclusion

### found items

| aspect | found |
|--------|---------|
| journey tests added | none |
| journey tests needed | none |
| repo uses .play. convention | no |
| name violations | none |

### why it holds

1. **no journey tests added** — feature is config, not user flow
2. **no journey tests needed** — behavior is automatic, no user action
3. **repo does not use .play. suffix** — convention not established
4. **extant tests are sufficient** — unit + integration cover behavior
5. **dogfood proves end-to-end** — slowtest report visible in test run

### this review is n/a

no journey tests exist because no journeys exist.

the feature adds config that jest consumes automatically. the user's "journey" is:
- run tests (habit)
- see report (automatic)

no explicit journey to test. validation happens via:
- config check (unit test)
- config apply (integration test)
- actual use (dogfood)

**no issues found. no fixes needed. convention is followed (by virtue of not applicable).**

