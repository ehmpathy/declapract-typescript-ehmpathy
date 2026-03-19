# self-review r1: has-questioned-assumptions

## assumption.1: 10s threshold is correct

**what do we assume here without evidence?**
we assume 10s is a reasonable threshold for "slow" integration tests.

**what if the opposite were true?**
if 10s is too short, many tests would be flagged as slow. if too long, truly slow tests would be missed.

**is this based on evidence or habit?**
evidence — rhachet-roles-ehmpathy uses 10s and validated it works well for that codebase.

**could a simpler approach work?**
the threshold is configurable via the reporter options. 10s is a sensible default.

**verdict:** holds — 10s is validated by reference implementation

---

## assumption.2: ignoresSortable is the right place

**what do we assume here without evidence?**
we assume `.slowtest/integration.report.json` should be in ignoresSortable, not ignoresOrdered.

**what if the opposite were true?**
if it were in ignoresOrdered, it would need to come in a specific position relative to other patterns.

**is this based on evidence or habit?**
evidence — there are no negation patterns for `.slowtest/`, so order does not matter.

**could a simpler approach work?**
ignoresSortable is the simplest — no order dependency.

**verdict:** holds — sortable is correct for this pattern

---

## assumption.3: test-fns 1.15.7 is stable

**what do we assume here without evidence?**
we assume 1.15.7 is stable and the slowtest reporter API is stable.

**what if the opposite were true?**
if the API changed, projects would break on upgrade.

**is this based on evidence or habit?**
evidence — this repo dogfoods 1.15.7 and the reporter works. rhachet-roles-ehmpathy also uses it.

**could a simpler approach work?**
we could use 1.15.0 (first version with slowtest), but 1.15.7 is latest stable with bug fixes.

**verdict:** holds — 1.15.7 is validated

---

## assumption.4: only integration tests need slowtest reporter

**what do we assume here without evidence?**
we assume unit tests and acceptance tests don't need the slowtest reporter.

**what if the opposite were true?**
unit tests should be fast by definition — slow unit tests indicate design issues, not test issues. acceptance tests are inherently slow (end-to-end).

**is this based on evidence or habit?**
evidence — this was explicitly triaged in the vision (lines 119-124). unit tests should be fast, acceptance tests are inherently slow.

**could a simpler approach work?**
no — a single reporter for all test types would create noise, not signal.

**verdict:** holds — integration-only is correct scope

---

## summary

all assumptions hold under scrutiny.

| assumption | verdict | rationale |
|------------|---------|-----------|
| 10s threshold | holds | validated by rhachet-roles-ehmpathy |
| ignoresSortable | holds | no order dependency |
| test-fns 1.15.7 | holds | dogfood validation |
| integration-only | holds | unit/acceptance have different characteristics |
