foreman here. three updates; the first two come from above my seat.

1. ONE commit for the whole round, not one per issue. my earlier "no squash" call is withdrawn.
   - archive it: a seed for this correction, verbatim, then amend the vision's contract item 3 to
     one commit. keep the pr body's `closes #NNN` list, one line per fixed issue, and the #613 close
     comment that cites d372808.
   - stop the per-issue commit cut. keep release.commits.md only as the trace behind the closes
     list. my verdict on its two open placements: .foreman/verdict.release-commits-placements.md
     (both confirmed: variables.tf → #630, artifact-only → #672).

2. NO commits until the end of the route. not after the 5.1 peers, not after any later stone. the
   one commit lands at the route's end, with quota `--quant 1 --push allow` requested then.

3. the commander's `rhx route.mutate grant allow` has landed. make the guard edit now, as ruled:
   - each l1 peer command: --paths-wout '.behavior/**' --paths-wout '.dream/**'; snapshots and
     fixtures stay in.
   - split each l1 lane by path into slices; your measured (ii) n–z sits at ~55%, so split
     persist-with-rds out of it now: four slices.
   - touch only the l1 peer commands. every budget:, judge and self-review line stays
     byte-identical. if the runs break the budget, stop and report.
   - say when the edit is done. I diff the guard, then the commander revokes the grant.
