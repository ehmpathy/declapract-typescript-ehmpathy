# fulcrum F-d31-fanout-sequence — when the shared .deploy-sls.yml acceptance fan-out lands

- rework = dirty
- status = resolved (wisher decision: neither A nor B — contemp-only, no fan-out)
- confidence = 100% (settled by the wisher)

## the fork, stated fairly

D31 (#573) wants the acceptance gate to prove the dual-publish deploy. the seam/primitive
(`sdkAwsLambdaEnvAccess{Ancient|Contemp}`) is shipped. two shapes were weighed for when a fan-out
over both fleet slugs lands in the shared `.deploy-sls.yml` `assure` job:

- **A — NOW.** the shared `assure` job grows a matrix over `ACCEPTANCE_FLEET ∈ {ancient, contemp}` this
  round; the `contemp` arm no-ops until a service publishes `-prep-`.
- **B — at the ENDPOINT.** the fan-out lands after self dual-publishes and flips `Ancient → Contemp`, so
  the `contemp` arm has a real fleet to hit on day one.

## the wisher decision — neither A nor B

> "i think we can simply run acceptance test against the contemp, alone. not the ancient. on cicd."

the fork dissolves: there is NO fan-out. the self-acceptance gate runs against the contemp fleet ONLY.
the rationale the decision rests on:

- dual-publish deploys the SAME artifact under both slugs, so a green contemp run IS a green ancient run.
  a run against the ancient slug too is redundant, never additive.
- contemp is the service's own access-tier slug — `-prep-` at prep, `-prod-` at prod — so ONE
  access-keyed run covers every tier the deploy job ships. no per-tier soft-skip is needed, so the
  `access == 'prep'` guard shape (which motivated fork A's no-op arm) never applies.
- the ancient slug is an inbound alias for callers still on the old name, an outbound concern, never a
  target for the self-acceptance gate.

## what landed (this round)

- `.deploy-sls.yml` `assure` job: collapsed the two acceptance steps into one
  `ACCESS=${{ inputs.access }} npm run test:acceptance`, with a timeless contemp-only rationale comment.
- `src/acceptanceContempFleetGuard.declapract.integration.test.ts`: the inverted clamp — asserts the
  single ACCESS-keyed run and that NO `ACCEPTANCE_FLEET` selector (ancient or contemp) survives; + a
  snapshot of the acceptance block. it replaces `dualFleetAcceptanceGuard.*` (removed), which clamped
  the fan-out the decision reverses.
- `src/practices/tests-service/best-practice/.declapract.readme.md`: §"acceptance targets the contemp
  fleet" + §"the CI acceptance gate runs contemp only" replace the both-fleets + fan-out sections.
- the DEPLOY-side dual-publish (`deploy:release:ancient|contemp` in the `serverless` practice) stays —
  the decision collapses only the acceptance gate, never the deploy.

## rework, and why dirty

a shared `.deploy-sls.yml` callee change is inherited by EVERY service the moment it lands. the decision
is now the settled shape, so the dirt is spent, not open.

## where

- `src/practices/cicd-service/best-practice/.github/workflows/.deploy-sls.yml` (the collapsed step)
- `src/acceptanceContempFleetGuard.declapract.integration.test.ts` (the inverted clamp)
- `src/practices/tests-service/best-practice/.declapract.readme.md` (the contemp-only doc)

## verdict

resolved by the wisher on 2026-09-13: contemp-only. the fan-out fork (A vs B) is moot; the dream
`.dream/v2026_09_10.d31-shared-deploy-sls-acceptance-fan-out.md` is retired.
