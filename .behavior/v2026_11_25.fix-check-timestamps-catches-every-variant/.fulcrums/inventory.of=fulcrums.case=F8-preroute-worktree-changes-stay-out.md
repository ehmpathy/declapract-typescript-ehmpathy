# F8: worktree changes older than this route stay out of its pr

## .the fork
the worktree held changes before this route began: rhachet and role bumps in `package.json` and
`pnpm-lock.yaml` (with a self dev dependency on `declapract-typescript-ehmpathy`), a pnpm branch in
the root `.husky/check.lockfile.sh`, and actor config under `.agent/.actors/`. a reviewer that reads
the worktree diff since `main` sees them as part of this work. the root lockfile edit has no twin in
the husky practice (`src/practices/husky/best-practice/.husky/check.lockfile.sh`), which
`rule.require.entool-requests-as-practices` forbids for a change this repo ships.

## .taken, why
leave all of them out of this pr; fix none of them here. the wish is the timestamp hook; none of
these serves it. the commit stages by explicit path and commits staged files alone
(`--unstaged ignore`), checked against the list in `5.1.execution.from_vision.yield.md` § scope of
the pr. the pr body names each, so the commander can route them: the lockfile edit belongs in the
husky practice, not the root, if it is to ship at all.

## .rework
clean: no file of this pr reads or writes them; each can land, move, or drop on its own.

## .confidence
90%. the one risk is a reader who takes a worktree-wide review as a pr-wide one; the pr body says so.

## .where
- `.husky/check.lockfile.sh`
- `package.json`, `pnpm-lock.yaml`
- `.agent/.actors/`

## .verdict
open: for the commander's review of the pr.
