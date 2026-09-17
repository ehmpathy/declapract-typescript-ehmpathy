# fulcrum F-config-host-tier-strategy — byte-preserve+CNAME-alias vs structural-token-swap

- rework = dirty
- status = open (decision 3 picks byte-preserve; the wisher must ratify the residual window)
- confidence = 70%

## the fork, stated fairly

`migrateDevConfigToPrep` rewrites the `access` key (`"dev"` → `"prep"`) but preserves every byte of
`database.tunnel.lambda.host`. so a consumer whose config carries a `dev`-named host stays aimed
at a `-dev-` slug resource after `access` flips to `prep` — the same two-word divergence the north
star exists to kill, one layer down in the config value.

two paths close it, and they are opposite:

- **byte-preserve + CNAME alias** (north-star decision 3) — the migrator never touches the host; the
  `-dev-`-named host is re-pointed at the one prep cluster by a Route53 CNAME, zero data moved. the
  window closes when the alias lands, human-gated per env.
- **structural token-swap** (wish row 4) — the migrator rewrites the tier token in the host itself.

## why the token-swap is refused (the three grounds, codified in the migrator jsdoc)

1. **structural ambiguity** — a `.dev` label reads alike wherever it sits: a `.dev` gTLD, a foreign
   mid-dotted host, an internal tier token. a blind `dev → prep` host rewrite corrupts the first two
   to fix the third.
2. **the per-consumer prep host is unknowable** — the template cannot know a given consumer's actual
   prep cluster host. to emit one is the meta-lesson's forbidden value-guess.
3. **JSON admits no marker + the gate is EXISTS** — there is no place to leave a `@declapract:review`
   marker in a JSON value that a plan surfaces, and the config gate is EXISTS (never reads content),
   so a spliced host rewrite reads CLEAN in plan even when wrong.

⇒ so the byte-preserve is correct behavior, and any host rewrite reintroduces a silent break to
close one.

## rework, and why dirty

the residual window is real: a consumer who has NOT set up the CNAME alias inherits a still-live
`dev`-named host that now disagrees with the `prep` access. the close is a human-gated per-env
Route53 cutover, not a code change — so a reversal of the chosen path ripples into live
infrastructure steps, never a one-line template edit. dirty.

## confidence, and why 70%

the code and the north star already agree on byte-preserve, and the three grounds against token-swap
are sound. the 30% doubt is whether the wisher accepts the residual silent-wrong-tier window as a
tolerable transition cost, or wants a louder signal (a plan-visible diagnostic the JSON+EXISTS gate
cannot carry today) before the alias lands.

## where

- `src/utils/migrateDevConfigToPrep.ts` — the byte-preserve rewrite + the three-grounds jsdoc
- `.dream/v2026_09_10.fix.config-host-tier-migration.md` — the caught dream

## verdict

open — byte-preserve ships as decision 3's path; the wisher must ratify that the CNAME cutover is
the sanctioned close and the residual window is acceptable for the transition.
