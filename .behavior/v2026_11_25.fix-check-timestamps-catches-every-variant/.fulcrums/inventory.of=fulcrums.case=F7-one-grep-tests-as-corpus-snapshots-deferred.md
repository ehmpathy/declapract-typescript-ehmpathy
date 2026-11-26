# F7: the scan stays one grep, the jest tables stay the one corpus, halt snapshots wait for the halt-message change

## .the fork
peer review asks to split the scan into a loop per form (and add a large-file perf row), to move
the variant rows into a data file the probe and the test both read, and to snapshot every halt and
fault output now.

## .taken, why
keep one `grep -E` per staged file: the extant scan shape, ten times fewer greps per file, and each
form already reads alone as a named variable. keep the jest tables as the one corpus: the probe
holds no cases of its own, and a shared data file would bind the test to a dev tool. snapshot one
halt per friction family (`[case21]`: zoned basic clock, one-digit ratio, hour-only meridiem, date
then a number), each clock masked; a snapshot per row waits for the halt-message change in the
dream, which rewrites them all, and which a test that names the matched form needs.

## .rework
clean: each is additive later (a perf row; a split loop behind the same exit codes; snapshots with
masks). no caller hardens against their absence.

## .confidence
80%. the perf row is the weakest call: no large-file stat is on record.

## .where
- `src/practices/husky/best-practice/.husky/check.timestamps.sh`
- `src/practices/husky/check.timestamps.play.declapract.integration.test.ts`
- `.dream/v2026_11_25.feat.timestamp-halt-names-the-match.md`

## .verdict
open: for the commander's review of the pr.
