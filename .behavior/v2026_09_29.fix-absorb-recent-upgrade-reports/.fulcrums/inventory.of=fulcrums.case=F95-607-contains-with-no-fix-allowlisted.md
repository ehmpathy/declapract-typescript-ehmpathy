# F95 — #607: `jest.unit.env.ts` and `provision/schema/sql/init.yml` stay CONTAINS with no fix, on the allowlist

- **fork:** (a) author a findsert fix for each, which unions the declared lines into the extant
  file; (b) keep CONTAINS with no fix, named on the `UNFIXABLE_BY_DESIGN` allowlist of
  `practiceFixCoverage` with its reason.
- **taken:** (b). both files are ones the adopter extends by hand: `jest.unit.env.ts` is free-form
  typescript (mocks, guards), and `init.yml` is a changelog list whose order the adopter owns. a line
  union cannot know where a declared line belongs in either, so a fix would risk a file that does
  not compile or a changelog out of order. the allowlist is the shape #607 asked for: every gap is
  named, with its reason, and a new gap turns `practiceFixCoverage` red.
- **rework:** clean — add a `fix` to either declaration and drop its allowlist row; the sweep then
  holds the fix to `check(fix(x))` and `fix(fix(x)) === fix(x)`.
- **confidence 70%, low because:** while either check fails, declapract marks the whole file manual,
  so a peer practice's fix on that same file waits for the adopter (the #607 hazard, narrowed to two
  files no peer practice declares today).
- **where:** `src/practiceFixCoverage.declapract.integration.test.ts` (`UNFIXABLE_BY_DESIGN`).
- **verdict:** —
