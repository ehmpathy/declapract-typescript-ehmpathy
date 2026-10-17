# S20 — husky owns the commit-msg hook, and it always ships

## .said

on `src/practices/husky/best-practice/.husky/check.commit.sh`, removed from husky by the #630
one-owner dedupe:

> why did check commit get removed?

> isnt that a hard requirement?

> ensure its enbriefed as a criteria and clamped to ensure it ships frmo atleast one practice

> feels like it should live in husky though, no?

## .settled

- the commit-msg hook is a hard requirement: every usecase with `husky` ships `.husky/commit-msg`
  and `.husky/check.commit.sh`.
- `husky` owns every `.husky/` hook. `conventional-commits` owns the commitlint config and deps the
  hook checks against, and ships no `.husky/` file.

## .landed

- both hook files back in `husky/best-practice/.husky/`, byte-equal to main; the
  `conventional-commits` copies removed
- `rule.require.commit-msg-hook-ships.md`
- `src/huskyCommitMsgHook.declapract.integration.test.ts` — red with `check.commit.sh` moved out
  (3 of 4 fail), green restored
- `release.commits.md` #630 rows, the 5.1 yield L5 row, `refs/research.cicd.md` row
