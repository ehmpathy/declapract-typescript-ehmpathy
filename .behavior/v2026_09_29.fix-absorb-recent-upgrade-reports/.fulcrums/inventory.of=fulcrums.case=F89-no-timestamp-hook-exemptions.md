# F89 — #684: no exemption to the timestamp hook, ever; a lock pins it

## .the fork

- **A:** exempt `.goals/` (the plan of row 684): the achiever ask log is append-only and a guard
  forbids its edit, so a pasted shell-prompt clock deadlocks the commit.
- **B:** no exemption of any kind. the hook blocks every timestamp in every tracked file; the log
  must not hold a clock.

## .taken

B, ruled by the wisher (S16). the hook exists to block all timestamps. an exemption reopens the
privacy leak, one dir at a time.

the enforcement the wisher asked for: `check.timestamps.lock.sh` runs first in `pre-commit` and
compares the git blob id of `.husky/check.timestamps.sh` (on disk and in the index) to the id the
practice stamps at apply. a mismatch halts: "revert the hook, zero exceptions — remove all
timestamps". the id is git's own blob id (`git hash-object`), so no sha256 tool must exist on the
host, and the `.declapract.ts` derives it from the template, so a practice upgrade rewrites hook and
lock together and they never drift.

## .rework

clean. two template files, one pre-commit line.

## .what #684's reporter now owes

the deadlock is real: the ask log must keep a clock out (mask at write time). that lives in the
repo that ships the achiever role — a reseed dream, per S5.

## .verdict

ruled (S16).
