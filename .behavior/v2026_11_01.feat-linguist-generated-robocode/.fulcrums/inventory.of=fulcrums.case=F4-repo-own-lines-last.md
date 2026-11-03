# F4: repo-own lines move below the managed sections

## .the fork

- **A. keep the current order** — repo-own lines first, managed block last (the git practice's fix today).
- **B. invert** — managed sections first, repo-own lines last.

## .taken: B

git takes the last line that matches a path. under A, a repo's `-linguist-generated` override sits above the practice line and loses without a word (case=4).

## .rework: clean

the order in the shared util. a one-time reorder lands in each consumer's `.gitattributes` on the first apply.

## .confidence: 85%

the lock-file lines (`-diff`, `merge=theirs`) never conflict with repo lines in practice, so the reorder costs one diff per repo and gains an override that works.

## .risk: none

no credential, no prod write: line order in a generated file.

## .where

`1.vision.yield.md` § the contract; case=4.
