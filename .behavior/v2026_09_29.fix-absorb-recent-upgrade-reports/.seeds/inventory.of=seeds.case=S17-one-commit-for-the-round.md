# S17 — the round lands as one commit, after the peers pass

## .said

> foreman here. correction from above my seat: the expectation is ONE commit for the whole round, not one per issue. my earlier "no squash" call is withdrawn.
>
> 1. archive it: a seed for this correction, verbatim, then amend the vision's contract item 3 to one commit. keep the pr body's `closes #NNN` list, one line per fixed issue, so every report still closes from the release. keep the #613 close comment that cites d372808.
>
> 2. order: commit AFTER the peers pass, so the one commit holds the reviewed tree and no review fix needs a second commit. the quota request goes up for `--quant 1 --push allow` (push allow, since the commit must reach the pr).
>
> 3. unchanged: the review fix is still the guard edit (exclude .behavior/** and .dream/**, split each l1 lane by path). a commit does not shrink since-main. your measured slices are fine; split persist-with-rds out of slice (ii) now for margin.
>
> 4. drop the file → issue commit cut; it is no longer owed.

## .settled

- a round lands as one commit, not one per issue. the per-issue split is not owed.
- the commit is made after the peer reviews pass, so it holds the reviewed tree and no review fix
  needs a second commit. the quota it needs is one commit, with push allowed.
- every fixed issue still closes from the release: the pr body lists `closes #NNN`, one line each.
  #613 closes with a comment that cites d372808.
- a commit does not shrink a `since-main` review scope; the overflow fix stays the guard edit.

## .landed

- `1.vision.yield.md` contract item 3 and `.what is awkward`
- `release.commits.md` — commit order dropped; kept as the trace behind the `closes` list
- `blocker/5.1.execution.from_vision.md` — persist-with-rds split out of slice (ii); quota ask
