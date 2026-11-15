# F2: dismiss a stale approval on a new push?

## .the fork
- `dismissStaleReviews: true`: any diff change after approval drops the approval
- `dismissStaleReviews: false`: an approval stands across later pushes

## .taken
`true`.
- severity = frequency × cost. a push after approval is common in this fleet: the bot fixes the
  nits a reviewer raised after they approve. its cost is the harm the wish targets, unread code on
  main, and once merged no step reaches back. that is a critipath, and `false` leaves it unhandled
- `true` makes it fail safe: github dismisses the approval and refuses the merge until a human
  re-approves
- the cost of `true` is friction, not harm. github's docs list **Update branch** among the changes
  that dismiss an approval, and `strict: true` forces an update each time main moves. so a pr open
  across a main merge needs a second click. a re-approval is a workable route; an unread merge is not

## .rework
clean: one boolean in `resources.ts`, plus its clamp test.

## .confidence
65%. the friction lands on every open pr each time main moves, fleet-wide; a commander who weighs
throughput over the push-after-approval gap would pick `false`.

## .where
`resources.ts`, branchMainProtection.requiredPullRequestReviews

## .verdict
open, for the commander.
