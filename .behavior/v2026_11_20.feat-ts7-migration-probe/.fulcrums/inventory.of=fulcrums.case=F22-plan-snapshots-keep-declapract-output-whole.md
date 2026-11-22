# F22 · the plan snapshots keep declapract's plan output whole

- fork: peer review r006 of 5.3 (snapshot blemishes, nitpick.1) reads the `- Expected toContain` / `+ Received relevantKeys` diff lines in the typescript-node plan snapshot as debug noise. options:
  - (a) filter the plan text down to the file and practice lines before the snapshot
  - (b) snap the plan an adopter sees, verbatim
- taken: (b).
  - those lines are `declapract plan`'s own output: its `CONTAINS` check prints that diff under every flagged file, in every adopter's terminal
  - the snapshot exists to show a reviewer what the adopter reads; a filtered one would hide the very text an adopter must parse
  - the reviewer's own note allows this: keep it if it is declapract's standard output
- rework: clean. one mask in the test, if the plan's format is ever judged noise at its owner.
- confidence 90%.
- where: `src/practices/typescript-node/__snapshots__/tsconfig-options-removed-in-ts7.declapract.integration.test.ts.snap`.
- verdict: —
