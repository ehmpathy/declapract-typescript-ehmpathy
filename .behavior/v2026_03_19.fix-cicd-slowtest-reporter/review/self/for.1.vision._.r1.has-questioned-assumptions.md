# self-review: has-questioned-assumptions

## assumption 1: rhachet-roles-ehmpathy is the reference implementation

**what do we assume here without evidence?**
- that rhachet-roles-ehmpathy's configuration is correct and optimal

**what evidence supports this?**
- the wish explicitly references it: "rhachet-roles-ehmpathy has recently upgraded to use it"
- the wisher asks to replicate the pattern

**what if the opposite were true?**
- if rhachet-roles-ehmpathy had bugs, we'd inherit them
- verified: the implementation there is minimal and correct

**did the wisher actually say this?**
- yes: "you can browse the repo via git.repo.get to see how"

**verdict: holds** ✅ - wisher explicitly pointed to it as reference

---

## assumption 2: test-fns 1.15.0 is the minimum viable version

**what do we assume here without evidence?**
- that 1.15.0 is when slowtest.reporter.jest was added

**what evidence supports this?**
- npm view shows the export exists in 1.15.0
- version 1.14.0 does not have it (verified via exports check)

**what if the opposite were true?**
- if we picked wrong version, imports would fail
- verified: 1.15.0 has the export

**did the wisher actually say this?**
- no - this was derived from technical investigation

**verdict: holds** ✅ - verified via npm exports

---

## assumption 3: .slowtest/ directory convention

**what do we assume here without evidence?**
- that .slowtest/ is the right directory name

**what evidence supports this?**
- rhachet-roles-ehmpathy uses `.slowtest/integration.report.json`
- this is what we're asked to replicate

**what if we used a different path?**
- .test-reports/ - more generic
- .jest/ - more specific to jest
- the reporter config takes an `output` param, so it's flexible

**did the wisher actually say this?**
- implicitly: "just like it was in rhachet-roles-ehmpathy"

**verdict: holds** ✅ - matches the reference implementation

---

## assumption 4: only integration tests need the reporter

**what do we assume here without evidence?**
- that unit and acceptance tests don't benefit from slowtest reports

**what evidence supports this?**
- rhachet-roles-ehmpathy only uses it for integration
- unit tests should be <1s by design
- acceptance tests are inherently slow

**what if the opposite were true?**
- unit tests with slow reporters: noise from a few slow tests
- acceptance tests with slow reporters: all would be flagged

**did the wisher actually say this?**
- no - this was inferred from the reference

**verdict: holds, flagged for wisher** ⚠️
- integration-only is reasonable default
- acceptance could be added if wisher prefers

---

## assumption 5: declapract best-practice file will be overwritten (not CONTAINS)

**what do we assume here without evidence?**
- that jest.integration.config.ts uses full file match

**what evidence supports this?**
- checked: there's no .declapract.ts wrapper for jest.integration.config.ts
- the file is a plain template that gets applied directly

**what if the opposite were true?**
- if CONTAINS semantics: users couldn't customize the reporter config
- if full match: users must override whole config to change threshold

**did the wisher actually say this?**
- no - derived from how declapract works

**issue found:** the jest config files are plain templates (full match), so:
- users can't easily customize the 10s threshold
- they'd need to override the entire jest.integration.config.ts

**possible fix:** add a .declapract.ts wrapper that uses CONTAINS semantics
- but this may be excessive for the MVP
- users can fork/override the config if needed

**verdict: noted** ⚠️ - acceptable for MVP, could improve later

---

## assumption 6: json report file should be ignored

**what do we assume here without evidence?**
- that the json report should not be committed

**what evidence supports this?**
- the wish explicitly says: "make sure that the slowtest output file is added to .gitignore"
- the report contains machine-specific durations

**did the wisher actually say this?**
- yes, explicitly

**verdict: holds** ✅ - wisher explicitly requested this

---

## summary

| assumption | verdict |
|------------|---------|
| rhachet-roles-ehmpathy is reference | holds ✅ |
| test-fns 1.15.0 is minimum | holds ✅ |
| .slowtest/ directory convention | holds ✅ |
| integration tests only | holds, flagged ⚠️ |
| full file match (not CONTAINS) | noted, acceptable for MVP ⚠️ |
| json report should be ignored | holds ✅ |

no hidden assumptions that require changes. two items flagged for awareness.
