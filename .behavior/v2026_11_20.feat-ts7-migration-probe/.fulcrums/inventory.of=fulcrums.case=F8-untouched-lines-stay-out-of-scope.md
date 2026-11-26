# F8 · the decode-friction in two extant utils stays out of this pr

- fork: a peer review graded the inline span fold and the regex/offset span collection in `src/utils/withGetDatabaseConnectionRepointed.ts` and `src/utils/withPgClientSslDeclared.ts` as blockers (`rule.forbid.inline-decode-friction`, `rule.require.named-transformers`). options:
  - (a) refactor both utils here: extract `asTextWithSpansSpliced`, `getRepointedSpecifierSpans`, a named import-offset lookup
  - (b) leave them; this pr's diff in each file is the one import line (`from 'typescript'` → `from '@typescript/typescript6'`)
- taken: (b).
  - `git diff` on each file shows exactly one changed line, the import. every line the review cites predates this branch
  - `rule.prefer.scouts-honor` bounds a fix-forward to cheap, safe, in-scope edits; a re-shape of two exported orchestrators that three shipped bad-practices call is neither cheap nor in scope for a compiler upgrade, and a large cleanup smuggled into an unrelated change is itself a blocker under that rule
  - the shared shape the review names (a back-to-front splice fold) does exist three times now, with `asContentsSpliced` in the new bad-practice; a lift to `src/utils` is a real follow-up, caught as a dream
- rework: clean. (a) is a self-contained refactor pr against main, with its own tests.
- confidence 90%: the scope read is mechanical (the diff). residual: a reviewer may hold that an edit to a file obliges its cleanup; the rules set the bound at cheap + in-scope.
- where: `.dream/v2026_11_21.feat.lift-span-splice-fold.md` · review r3 (mech-decode-friction) blocker.1, blocker.2, nitpick.1.
- verdict: —
