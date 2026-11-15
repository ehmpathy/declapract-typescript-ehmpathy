# F12: do the census's gh reads move to a shared operations file?

## .the fork
- lift `get_or_absent` and `fail_read` (and the test sandbox and stub) into shared files now
- keep them in the skill until a second skill needs them

## .taken
keep them. one consumer; a lift now guesses at the second consumer's shape
(`rule.prefer.wet-over-dry`, `rule.prefer.most-common-denominator`). both reviewers that raised it
said to wait for the second consumer.

## .rework
clean. the reads are named and take named args, so a lift is a move.

## .confidence
90%.

## .verdict
best-guessed.
