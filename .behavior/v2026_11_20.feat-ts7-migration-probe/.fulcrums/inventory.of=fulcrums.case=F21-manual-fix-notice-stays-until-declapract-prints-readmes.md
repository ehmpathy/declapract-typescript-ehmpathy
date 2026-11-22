# F21 · the manual-fix stderr notice stays until declapract prints practice readmes

- fork: peer review r001 of 5.3 (repo-rules, nitpick.1) reads `emitManualFixNoticeOnce` as copium: a non-owner works around `declapract plan`, which loads a practice readme and never prints it. options:
  - (a) drop the notice; an adopter meets `FIX_MANUAL` with no move named until declapract changes
  - (b) keep the notice, additive to the check's verdict; catch the fix at its owner
- taken: (b).
  - the notice names the move at the moment the adopter needs it (`rule.require.errors-name-the-fix`); without it, two ts7 manual practices flag a file and say naught on what to do
  - the verdict stays the check's return or throw, so the notice hides no failure; the `.npmrc` practice set the same precedent
  - the root fix lives in `ehmpathy/declapract`, caught as `.dream/v2026_11_21.reseed.declapract-plan-shows-manual-practice-readme.md`
- rework: clean. one util and its call sites leave once the plan prints readmes.
- confidence 80%: residual is that the reviewer is right on the cause; this only defers the cure to its owner.
- where: `src/utils/emitManualFixNoticeOnce.ts` · the two manual ts7 practices' `.declapract.ts` checks.
- verdict: —
