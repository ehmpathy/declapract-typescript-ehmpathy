# F6: the pre-extant test shapes stay as they are; the probe and the blob-read fault get coverage

## .the fork
peer points ask for work beyond the hook and its test rows:
- reshape `genStagedRepo` to `(input: { files })` — a shape the peer husky suites share
  (`check.secrets.play…` uses the same positional call)
- move each suite's `runGuard` call into `useThen`, and its fixture into `given`; split the bundled
  asserts of `[case1]`, `[case15]`–`[case17]`; reorder `[case17]`; rename `[case-scope]`
- snapshot the `[case15]`, `[case16]`, `[case17]` error outputs, locked by `toContain`
- give the repo-local `check.timestamps.probe` skill its own test and snapshots

## .taken, why
- **probe: covered.** `src/checkTimestampsProbe.declapract.integration.test.ts` spawns the probe
  from the repo root: verdicts, `--show full`, a multi-halt run, `--scan`, `--hook @head`, six
  bad-input refusals (exit 2), a broken hook (exit 1), each output snapshotted with temp paths and
  clocks masked. jest ignores `/.agent/`, so the test sits at `src/` root with this repo's other
  meta tests. three review lanes raised it at verification; the cost was small, so the call flipped
- **`[case16]` blob-read fault: snapshotted**, with the `[case18]` faults, so every exit-1 variant
  the hook prints has a snapshot
- **the rest stays.** each `when` in this suite makes one synchronous `spawnSync` call into a `const`
  and reads it from its `then`s: no `let`, no repeat call, the two cases the `useThen` rule names.
  the shape is the file's own, from `[case1]` on, and the peer husky suites share it. a rewrite
  touches 17 cases this pr did not write, and one, `[case17]`, is the guard's own no-exemption
  proof, which a move must not disturb. a dream holds the conversion

## .rework
clean: a later pr converts the husky suites to `useThen` + `given` fixtures in one pass, behind the
same rows and snapshots. no caller hardens against the current shape.

## .confidence
85%. the `useThen` shape is the weakest call: the rule's prose prefers `useThen` for any shared
result; this suite's results are sync and computed once, which the rule's antipatterns do not cover.

## .where
- `src/practices/husky/check.timestamps.play.declapract.integration.test.ts`
- `src/practices/husky/check.secrets.play.declapract.integration.test.ts`
- `src/checkTimestampsProbe.declapract.integration.test.ts`
- `.dream/v2026_11_25.chore.husky-suites-to-usethen.md`

## .verdict
open: for the commander's review of the pr.
