# F5: must the approval come from a human?

## .the fork
- any account with write may approve (github's default)
- only a named human team may approve: a CODEOWNERS file (`* @<org>/<team>`) plus
  `requireCodeOwnerReviews: true`

## .taken
any account with write (no CODEOWNERS), in this pr.
- `ehm-seaturtle` holds write (`/collaborators/ehm-seaturtle/permission` on sdk-aws-lambda:
  `write`), so its approval counts. it cannot approve a pr it authored (github docs), which covers
  most fleet prs. it CAN approve the rhelease app's release prs, so a release could pass the gate
  with no human read
- a CODEOWNERS file closes that, but adds a declared file to every adopter and a team to every
  org. that is a larger practice change than the wish asks for, and the team does not exist yet
- the gap is a conduct gap today: no fleet skill approves prs

## .rework
clean but wider: a CODEOWNERS best-practice file in provision-github (or the git practice), plus
`requireCodeOwnerReviews: true`, plus a human team per org.

## .confidence
75%. a commander who wants the gate to mean "a human read it", bar none, would take the wider change.

## .verdict
open, for the commander.
