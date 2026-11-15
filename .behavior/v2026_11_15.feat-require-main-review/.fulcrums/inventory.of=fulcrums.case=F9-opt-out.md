# F9: should a repo be able to opt out of the review gate?

## .the fork
- add an opt-out: a `declapract.use.yml` variable or an override point that sets
  `requiredPullRequestReviews: null` for a repo that chooses it
- ship no opt-out: every adopter gets one approval on main; a repo that needs another rule forks
  `resources.ts` and lives with the drift `declapract plan` reports

## .taken
no opt-out in this pr; asked of the commander.

- the incident the wish names (ehmpathy/sdk-aws-lambda#79) is a merge with no review. an opt-out
  is the one-line path back to that state, and its default would be what each repo picks under
  deadline
- the census finds no repo that requires a review today, so no adopter has a rule to preserve
- the cost lands on a repo where one human holds write: that human cannot merge a pr they author.
  the fleet's prs are mostly bot-authored, so the human approves them; a human-authored change
  goes through a bot-authored pr, or a deliberate settings change

## .rework
clean. a variable is additive: a later pr adds it with the gate as its default.

## .confidence
70%. the solo-owner cost is real, and the commander may weigh it above the incident.

## .verdict
open, for the commander.
