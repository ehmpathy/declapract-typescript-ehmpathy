# S16 — the timestamp hook takes zero exemptions, and a lock enforces it

## .said

> can you please immediately update to ensure that its super clear that no one should ever add any exemptions to the husky timestamp check? we literally added it there so that it blocks all timestamps

> ideally, we'd add some kind of secondary husky hook that checks this husky hook and if it changed from the hash it expected, it failsfast and says revert the hook, zero exceptions - remove all timestamps

> dont even mention permadrift. say the privacy reason as well

## .settled

- the husky timestamp hook blocks every timestamp in every tracked file. no path, dir, file, or
  pattern exemption may ever be added. the only skip is code that computes time (`*.ts`, `*.sh`).
- a second husky hook locks the first: it halts every commit while the timestamp hook differs, on
  disk or in the index, from the blob id the practice declared, and says revert, zero exceptions,
  remove all timestamps.
- the reason the hook and its messages give is privacy: a timestamp is a privacy leak that ships to
  every clone and fork, forever. the word "permadrift" is not used.

## .landed

- `check.timestamps.sh` header + halt message; `check.timestamps.lock.sh` (+ `.declapract.ts`);
  `pre-commit` sources the lock first; `check.timestamps.lock.play.declapract.integration.test.ts`
- F89 (ruled); inventory row 684 (no exemption; close with a comment)
