# F20 · the extant integration tests in other bad-practice dirs stay put in this pr

- fork: the 5.3 snapshot review found that an integration test (and its `.snap`) in a bad-practice dir ships in `dist/` and prints `[NO_CHANGE]` lines in every adopter plan. this pr moved its own. two extant cases remain, in `bottleneck` and `pnpm`, and `practiceTestFileLocation` scans `best-practice/` only. options:
  - (a) move both extant tests to their practice roots and widen the clamp, in this pr
  - (b) fix only the files this pr added; catch the extant cases and the clamp as a dream
- taken: (b).
  - the extant noise is `[NO_CHANGE]` lines: no adopter file changes, no harm ships
  - (a) moves tests and resnaps plans in two practices the ts7 change never touches, so it fails CLEAN: a rider on a compiler upgrade, not part of it
- rework: clean. each move is a rename plus an import path; the clamp widen is one glob.
- confidence 85%: residual is that a widened clamp would have caught this pr's own case before review; that clamp is the dream's first step.
- where: `src/practices/bottleneck/bad-practices/bottleneck/` · `src/practices/pnpm/bad-practices/package-lock-json/` · `.dream/v2026_11_21.fix.test-files-in-bad-practice-dirs-ship.md`.
- verdict: —
