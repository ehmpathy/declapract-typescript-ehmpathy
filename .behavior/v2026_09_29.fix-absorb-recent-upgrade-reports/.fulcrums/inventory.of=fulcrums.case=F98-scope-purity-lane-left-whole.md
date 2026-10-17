# F98 — 5.3's `mech-test-scope-purity` lane is left whole; the three other test-only lanes split

## .the fork

- **A:** split all four test-only 5.3 lanes into the four slices the wide lanes take.
- **B:** split only a lane whose measured targets sit over 60% of the window; leave the rest whole.

## .taken

B, per the foreman's ask (measure first, split only past 60%). no 5.3 lane had run, so the measure
reads the per-file token counts that the four 5.1 `ergo-friction-hazards` slice runs logged
(`.log/bhrain/review/[time]-*/tokens.expected.md`, one per slice run), whose union covers every
`ts/sh/md/snap` file in the diff:

| scope | tokens | share of the ~1M window (from `metrics.expected.json`: 354,421 = 35.4%) |
|---|---|---|
| `*.test.ts` + `*.snap` (behavior-experience-coverage, mech-given-when-then, mech-test-intent) | ~637.5k | ~64% before rules and refs → split |
| `{src,blackbox}/**/*.test.ts` only (mech-test-scope-purity) | ~490.0k | ~49% plus one small rule glob → whole |

the sums are hand arithmetic over the logged tree, ±5k.

## .rework

clean. if the lane overflows, give it the same four `--paths-with` slices as its peers; touch only its
`run:` line.

## .confidence

75% — the 5.1 tree predates this round's late test edits by a few files, and the window figure is
derived, not stated by the brain.
