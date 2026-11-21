# F28 — the github declaration's real plan runs in each adopter, not here

## .the fork
- (a) run a real `declastruct` plan of the `provision-github` resources against a scratch github repo in this suite
- (b) keep this suite's clamp on the declared text (contexts, plan env), and leave the real plan to the adopter's own `provision:github` run on its own repo

## .taken — (b)
- a real plan reads branch protection and environments, which needs an admin token on a repo this suite would own; this repo's ci holds no such token, and a scratch repo would be a durable remote resource the route does not declare
- every adopter runs the real plan against its own repo at upgrade, and the readme names that apply from the upgrade branch (e22); github rejects a bad context there, at the first run
- the clamp here pins what this repo controls: the context names the gate emits, and the plan's environment

## .rework — clean
add one `given` that runs `declastruct plan` against a scratch repo with a keyrack-held admin token; no contract changes

## .confidence — 80%
low only because a context name github rejects would surface at the adopter's plan, one hop later than here

## .where
`src/practices/provision-github/github-plan-environment.declapract.integration.test.ts`

## .verdict
open — fulcrum council at the end of the route
