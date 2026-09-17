# fulcrum F-4b-rename-sequence — when the environment export `stage` → `access` rename lands

- rework = dirty
- status = resolved (superseded by `rule.forbid.stage-term`; option A landed)
- confidence = 70%

## the fork, stated fairly

wish row 4b wants `environment.ts` to export one axis: `access`. the VALUE is already collapsed
(`stage = envStatic.access`), but the exported NAME is still `stage`, and consumers import it. two shapes
for when the rename lands:

- **A — NOW.** rename `export const stage` → `export const access` this round and sweep every importer.
- **B — at the ENDPOINT.** hold the rename until `grep AccessAncient → 0` org-wide, then delete the whole
  axis in ONE move (the `-dev-` publish, the `Ancient` helper, and the `stage` name together).

## what I took, and why (at the time)

took B (endpoint) as the best-guess, per the vision's settled design §2, which states `stage` deletes in
ONE move at the endpoint. a rename NOW breaks every consumer that still imports `stage`
(persist-with-dynamodb `jest.integration.env.ts`, tests-node `jest.unit.env.ts`) while the `-dev-` fleet is
still published — the flag-day rename the dual-publish design exists to avoid.

## rework, and why dirty

a cross-repo exported-name change consumers depend on: every importer must move in lockstep, and a reversal
re-breaks each. so dirty.

## where

- `src/practices/environments/best-practice/src/utils/environment.ts:7` (`export const stage = envStatic.access`)
- `src/practices/persist-with-dynamodb/best-practice/.../jest.integration.env.ts`, `tests-node/best-practice/jest.unit.env.ts` (importers)
- `.dream/v2026_09_10.row-4b-export-stage-to-access-endpoint-rename.md` (the paired dream)

## the owner roster row

wish row 4b (environment template `stage` → `access`). the value is collapsed; this fork is the
exported-name rename tail, sequenced to the endpoint.

## verdict

**superseded — option A landed, forced by `rule.forbid.stage-term`.** the fork is no longer live.
option B keeps `export const stage = envStatic.access`, and the hard rule (task #75, this round)
forbids `export const stage` in app code — its two exceptions cover only the serverless adapter, not
`environment.ts`. so the axis rename was not a free council choice between A and B; B is a rule
violation. task #77 (purge `stage` from app code) therefore landed option A: `environment.ts` now
exports `access` only (verified `environment.ts:9`, `grep '\bstage\b' src/practices/environments/best-practice/` → 0).

the flag-day break the original best-guess feared (a consumer's hand-written `import { stage }`
snaps on re-apply) is the deliberate cost of the wish's forced migration — a `stage` bridge cannot
soften it, because the bridge is itself forbidden. the serverless dual-publish scaffold
(`accessByStage`, the `-dev-` slug, the Ancient helper) is untouched by this: it is exception 2, and
its one-move retirement at `grep AccessAncient → 0` remains the genuinely council-gated endpoint.
