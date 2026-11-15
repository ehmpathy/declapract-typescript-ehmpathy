# F1: exempt release-please prs from the review rule?

## .the fork
- exempt: the rhelease app's release prs merge on green, as today
- require: release prs wait for one approval, like every pr

## .taken
require (no exemption).
- the release pr merge is the prod gate (`production-on-main`: `reviewers: null — PR merge is the gate`). an unreviewed prod gate is the gap the wish names
- the review is cheap: a version bump and a changelog of commits already reviewed
- an exemption is not expressible today: declastruct-github 1.4.0 classic protection has no `bypass_pull_request_allowances`, its rulesets carry no `pull_request` rule, and `enforceAdmins: true` closes the admin path

## .rework
clean if the commander picks exempt, but not in this repo alone: it needs a declastruct-github
release that models bypass allowances (dream: `.dream/2026_11_15.reseed-declastruct-github-review-bypass.dream.md`),
then a one-field change in `resources.ts`.

## .confidence
80%. the cost lands on every release: `git.release --into prod` pauses at the release pr.

## .where
`src/practices/provision-github/best-practice/provision/github.repo/resources.ts`, branchMainProtection

## .verdict
open, for the commander.
