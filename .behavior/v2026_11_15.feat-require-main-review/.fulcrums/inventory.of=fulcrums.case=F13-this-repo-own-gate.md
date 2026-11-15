# F13: should this repo's own main require a review?

## .the fork
- set `requiredPullRequestReviews` to one approval in this repo's own
  `provision/github/declastruct.resources.ts`, in this pr
- leave it `null` here, and ask the commander for a one-line follow-up pr

## .taken
leave it out of this pr; asked of the commander, with a lean of yes.

- this repo ships the gate to every adopter, so a green bot pr here that merges unread is the #79
  class at its widest reach. the census reads this repo as `lacks` (pr #803)
- its `provision.yml` applies on push to main, so a change here sets the rule at merge. the wish
  bounds forbid any write, and a merge is the commander's act
- a separate pr keeps the choice visible: it lands after the template, once the commander has
  ruled F1, F2, F5 and F9, so this repo adopts the same rule its adopters get

## .rework
clean. one field in one file, in a pr of its own.

## .confidence
85%. the lean is plain; the open part is the time of the follow-up, which is the commander's.

## .verdict
open, for the commander.
