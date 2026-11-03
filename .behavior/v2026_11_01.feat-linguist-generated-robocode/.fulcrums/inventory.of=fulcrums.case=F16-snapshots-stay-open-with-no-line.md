# F16: `*.snap` stays open with no line, not an explicit `*.snap -linguist-generated`

## .the fork

- **A. no line.** github linguist has no snapshot rule, so `*.snap` renders open by default; `git check-attr` reads `unspecified`.
- **B. an explicit line.** `*.snap -linguist-generated` in the tests-any section, so a future linguist rule could not fold snapshots.

## .taken: A

- linguist's `generated.rb` holds no snapshot or jest detection (checked by peer reviews r010 and r011, i004 and i005); the vision's research holds
- an explicit unset line is a rule against a threat that does not exist; it adds a managed line to every adopter's file and a header promise to keep
- a future linguist rule would show at once on any pr with a snapshot, and the fix is then one line in one section

## .rework: clean

one entry in the tests-any section, a resnap, and a self-apply.

## .confidence: 75%, why not higher

the wish names snapshots as open, and an explicit line would pin that promise in the file rather than in linguist's defaults.

## .risk: none

no credential, no prod write: one line in a generated file.

## .where

raised by peer review r011 (item 6) on 5.1 i005. file: `src/practices/tests-any/best-practice/.gitattributes.declapract.ts`.
