# F12: the practices declare one repo-root `.gitattributes`, not a file per directory

## .the fork

- **A. one repo-root file.** every declarer writes its tagged section into `/.gitattributes`.
- **B. a file per directory.** e.g. `.route/.gitattributes`, `src/access/daos/.gitattributes`, each with unanchored patterns.

## .taken: A

- a per-directory file must exist in each dir it governs. route dirs are created per behavior, after apply, so a declared `.route/.gitattributes` would miss every route made later; the root file covers them by pattern
- one file means one place an adopter reads what folds, and one place a repo-own un-fold line goes, last, where it wins
- the vision demos and the case inventory all assume the root file; the fold of each path is proved by `git check-attr` against it

## .rework: clean

the util would emit one file per directory; the sections already split by owner.

## .confidence: 85%, why not higher

per-directory files read locally and avoid the root-anchor question F2 raised. the root file wins on dirs that appear after apply.

## .risk: none

no credential, no prod write: where a generated text file lives.

## .where

raised by peer review r11 (enroll-impl-arch-defects) on 5.1 i003, against vision question Q11.
