# F14: the walk skill's new `7.cycles` branch is proven by real runs, not a snapshot

- fork: leave `rhx declapract.walk` (this repo's own dev skill) without a snapshot test, as it was before this pr ·
  add a skill test that runs the whole walk and snaps its tree
- found: the skill had no test before this pr. one run is a full build, apply, apply, plan, install, compile, and
  dpdm pass, about 3 minutes. its output carries a fresh temp dir, pnpm timings, and the cycles of whichever floor
  versions the install lands on that day, so a snapshot would need heavy masks to hold still
- taken: no snapshot. the skill is a verification aid a driver runs by hand, never shipped to an adopter. the new
  branch is report-only and gates naught. three runs on this tree proved the step, the pg-pool report, the reworded
  summary, and the stripped color codes. the verdict it reports is snapped where it ships: the walk test `[t3]` and
  `pg-pool-patch` `[case6]`
- rework: clean — a skill test is additive, one new file
- confidence: 80%. a reviewer may weigh a drift in the walk's tree above the cost of a 3-minute ci run
- where: `.agent/repo=.this/role=any/skills/declapract.walk.sh`
- verdict: —
