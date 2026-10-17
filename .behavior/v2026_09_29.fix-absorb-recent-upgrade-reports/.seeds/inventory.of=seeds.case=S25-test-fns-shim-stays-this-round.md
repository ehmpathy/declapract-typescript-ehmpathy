# S25 — the test-fns subpath stand-in stays this round, at a test-asset home

## .said

> this is a weird path to put this file; src/practices/tests-expo/best-practice/test-fns.autoprune.d.ts; also, cant we just fix it with a repair in test-fns?

asked how to fix the subpath types at their owner, the wisher chose "Keep shim this round", moved
to a better path.

## .settled

- the root fix is test-fns' own: `typesVersions` for each subpath. the stand-in is copium, kept
  only until that ships, then retired
- the stand-in lives with the test assets, `src/.test/assets/`, never at the template root
- each `jest.*.prepare.ts` reaches it by a triple-slash reference, so an adopter's tsconfig
  `include` (which skips dot dirs) never has to name it

## .landed

- `P/tests-expo/best-practice/src/.test/assets/test-fns.autoprune.d.ts`, the reference line in both
  `jest.*.prepare.ts`, the compile clamp, and the integration test
- F113; `.dream/v2026_09_29.reseed.test-fns-subpath-typesversions.md` names the new path
