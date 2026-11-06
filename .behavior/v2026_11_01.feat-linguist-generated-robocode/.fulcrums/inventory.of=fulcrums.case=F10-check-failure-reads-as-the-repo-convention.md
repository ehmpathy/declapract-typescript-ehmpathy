# F10: a gitattributes check failure reads as every declaration's does: an expect diff

## .the fork

- **A. keep the repo convention.** `check` asserts `expect(contents).toEqual(expected)`. on a miss, `declapract plan` shows the expect diff: the extant file beside the file the fix would write.
- **B. a bespoke message.** wrap the check to throw a named error that names the drift (which section moved, which line is stale).

## .taken: A

- every exact-equality declaration in this repo checks this way, the `.gitignore` declarers included; a bespoke format for one file would make the plan output read two ways
- the diff already is the most precise message: it shows each line to add, drop, or move
- the fix is one command, `declapract apply`, which the plan names for every flagged file
- a crlf checkout flags every exact-equality declaration in the repo, not only this one; the fix emits lf, and an apply settles it until the next crlf checkout. a repo-wide answer (an `eol=lf` line, or a crlf-blind compare in every check) belongs to its own change

## .rework: clean

a wrapper around the five checks, inside the shared util; no adopter contract changes.

## .confidence: 80%, why not higher

a named message reads better to a first-time adopter than a colored diff. the call favors one plan format across the repo.

## .risk: none

no credential, no prod write: the text of a plan-time failure.

## .where

raised by peer review r10 (enroll-impl-behavior-intent) on 5.1 i003. checks in `src/practices/*/best-practice/.gitattributes.declapract.ts`.
