# self-review r2: has-questioned-assumptions

## second pass with fresh eyes

re-read wish and vision slowly. found one issue to fix.

---

## hidden assumption found: "all tests" vs "integration tests only"

**what does the wish say?**
> "we want to make that a best practice, so that all tests get a slowtest reporter by default"

**what does the vision say?**
- integration tests only (lines 101-102)
- unit tests should be fast, acceptance is inherently slow

**is this a mismatch?**
- the wish says "all tests"
- the vision says "integration only"

**resolution:**
re-read the wish in context:
- it references rhachet-roles-ehmpathy
- rhachet-roles-ehmpathy uses integration-only
- the phrase "all tests" likely means "all projects get it" not "all test types"

**verdict:** the wish is ambiguous. flagged for wisher clarification.
- does "all tests" mean all projects, or all test types (unit/integration/acceptance)?

---

## error found: incorrect claim about CONTAINS semantics

**what does the vision say? (line 143)**
> "declapract uses CONTAINS, so user additions are preserved"

**what is the truth?**
- checked: jest.integration.config.ts has no .declapract.ts wrapper
- it's a plain template file → full overwrite semantics
- users cannot preserve customizations

**fix:** correct the vision to reflect reality

---

## action taken

updated vision.md line 143 from:
> "declapract uses CONTAINS, so user additions are preserved"

to:
> "user can override entire config if different threshold needed"

---

## other assumptions verified with rationale

### rhachet-roles-ehmpathy is the reference — holds ✅

**why it holds:**
- wisher explicitly said "browse the repo via git.repo.get to see how"
- not just implicit - the wisher pointed to it as the source of truth
- i verified the implementation is correct and minimal

### test-fns 1.15.0 has the export — verified ✅

**why it holds:**
- ran `npm view test-fns@1.15.0` and confirmed exports include `slowtest.reporter.jest`
- version 1.14.0 does not have this export
- this is the minimum version required, not an assumption

### .slowtest/ path matches reference — holds ✅

**why it holds:**
- rhachet-roles-ehmpathy uses `.slowtest/integration.report.json`
- wisher said "just like it was in rhachet-roles-ehmpathy"
- path is part of the reference implementation being replicated

### json report should be gitignored — wisher explicit ✅

**why it holds:**
- wisher explicitly said "make sure that the slowtest output file is added to .gitignore"
- this is a direct requirement, not an assumption
- the rationale (machine-specific data) is also sound

### integration-only scope — flagged for clarification ⚠️

**why flagged:**
- wish says "all tests" but reference uses integration-only
- ambiguity: "all tests" could mean "all projects" or "all test types"
- need wisher to clarify before proceeding

### full overwrite semantics — corrected in vision ✅

**why it was wrong:**
- i incorrectly claimed CONTAINS semantics
- jest config files are plain templates, not wrapped with .declapract.ts
- fixed the vision to reflect the actual behavior

---

## summary

- one error found and fixed: incorrect CONTAINS claim
- one ambiguity flagged: "all tests" interpretation needs wisher input
- all other assumptions validated with evidence
