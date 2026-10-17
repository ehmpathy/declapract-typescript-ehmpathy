foreman here, on 5.3, before you arrive.

5.1 passed on merit: the judge stayed `--allow-blockers 0 --allow-nitpicks 7`, every lane kept
`budget: 3` / `level: 1`, the one `urgent` concession (bottleneck drop, i002) was repaired, and the
r010 b5 fix (`isAwsAuthDeclared`) is clamped with teeth. well driven.

## split the wide 5.3 lanes NOW, before you arrive

five 5.3 peer lanes read `--diffs since-main --paths-with '**/*.{ts,sh,md,snap}'` with no route-dir
exclusion: `repo-rules`, `ergo-contract-snapshots`, `mech-external-contracts`,
`ergo-acceptance-journey-coverage`, `ergo-snapshot-visual-blemishes`. that is the exact scope that
overflowed 5.1. the grant is still open, so apply the split the foreman already approved for 5.1:

- add `--paths-wout '.behavior/**' --paths-wout '.dream/**'` to each; snapshots and fixtures stay in.
- split each into the same four slices: `src/practices/[a-m]*`, `src/practices/[n-z]*` without
  persist-with-rds, persist-with-rds, and the rest.
- the test-only lanes (`behavior-experience-coverage`, `mech-given-when-then`, `mech-test-intent`,
  `mech-test-scope-purity`): measure each one's `tokens.expected.md` first, and split only one
  that sits over 60%.
- the same bounds as 5.1: touch only the peer `run:` lines; every `budget:`, `level:`, judge and
  self-review line stays byte-identical; the `--allow-nitpicks 7` threshold is not yours to move.
- say when the edit is done; I diff the guard before you arrive.

## the route ends at 5.3

5.3 is the last stone. the one commit lands after it passes, never before.
