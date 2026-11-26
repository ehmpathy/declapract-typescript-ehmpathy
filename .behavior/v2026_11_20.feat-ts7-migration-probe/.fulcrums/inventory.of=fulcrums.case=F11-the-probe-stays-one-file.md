# F11 · the probe skill stays one file; the walk→probe path stays a two-site contract

- fork: a peer review asked to split `typescript.probe.sh` into a dispatcher plus `typescript.probe.operations.sh`, and to give the `.log/declapract.walk/<usecase>/repo.path` handoff one getter shared by both skills. options:
  - (a) split: an operations file, sourced by the probe and the walk
  - (b) keep one file; the path string sits in the walk (write) and the probe (read)
- taken: (b).
  - the two modes share three functions (`get_tsc`, `get_stats`, the lock), all in one 300-line file a reader scans top to bottom; the mechanic dispatcher shape pays off at many subcommands, not two modes
  - every skill file in `.agent/repo=.this/role=any/skills/` boots `say` unless listed `ref`, and the boot spec sits at 98% of its 5000-token cap: an operations file either breaks the cap or needs a `ref` line of its own
  - the path contract has one writer and one reader, each a single line; the probe fails loud with the fix (`rhx declapract.walk --usecase <x>`) when the file is absent, so a drift surfaces at first use
- rework: clean. a new file and two `source` lines; no caller sees a change.
- confidence 82%: the split is the org pattern for larger skills; if the probe gains a third mode, (a) wins.
- where: `.agent/repo=.this/role=any/skills/typescript.probe.sh`, `declapract.walk.sh`; review r11 point 7.
- verdict: —
