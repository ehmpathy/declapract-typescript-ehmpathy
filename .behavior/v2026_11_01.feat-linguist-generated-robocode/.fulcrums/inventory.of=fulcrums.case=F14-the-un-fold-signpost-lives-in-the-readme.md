# F14: the un-fold signpost lives in the git readme, not as a comment in the shipped file

## .the fork

- **A. readme only.** `src/practices/git/best-practice/.declapract.readme.md` states what folds and how to un-fold a path.
- **B. a header line in the file.** a managed comment, e.g. "to un-fold a path, add `<path> -linguist-generated` at the bottom", in git's section header.

## .taken: A

- the repo-own region has no header by design: it is the repo's, and the util emits no line there. a signpost must then sit in git's header, at the top of the file, far from where the un-fold line goes
- a header text change is a new `latest` plus a `retired` entry; every adopter's file and this repo's own churn once for a comment
- the readme is where declapract points an adopter when a check fails, and it now holds the table, the un-fold line, the dir-level and co-located dao cases, and the note to leave own lines untagged

## .rework: clean

one header line in git's section, the old header to `retired`, a resnap, and a self-apply.

## .confidence: 75%, why not higher

a signpost in the file reaches an adopter who never opens the readme. the call favors a quiet file over one more managed line.

## .risk: none

no credential, no prod write: a comment in a generated file.

## .where

raised by peer review r010 on 5.1 i004. files: `src/practices/git/best-practice/.gitattributes.declapract.ts`, `src/practices/git/best-practice/.declapract.readme.md`.
