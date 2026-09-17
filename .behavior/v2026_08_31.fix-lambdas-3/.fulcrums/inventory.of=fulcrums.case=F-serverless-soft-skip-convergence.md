# fulcrum F-serverless-soft-skip-convergence — a non-default provider timeout: force to 60, or relax the clamp

- rework = clean
- status = open (neutral terminus ships; the design call awaits the wisher)
- confidence = 70%

## the fork, stated fairly

the `serverless` practice's `withDefaultTimeout` transform (`serverless.yml.declapract.ts`) drives a
consumer's provider `timeout:` toward the template default `timeout: 60`. three arrival shapes:

- `timeout: 60` already → no-op.
- `timeout: 10` (the ancient literal) → rewritten to `timeout: 60`, byte-identical.
- any OTHER value (e.g. `timeout: 30`) → the fork.

for that third shape, two opposite resolutions are each valid, and neither is a mechanical widen:

- **force** — rewrite the consumer's explicit `timeout: 30` to `timeout: 60`. this OVERRIDES a
  deliberate operational choice — the wish's meta-lesson "a practice that emits a value cannot verify
  its own output" hazard, applied to a runtime knob a human tuned on purpose.
- **relax** — drop the CONTAINS requirement that a provider timeout be exactly `60`, so a non-60 value
  is simply accepted and the plan goes green as-is.

## the neutral terminus that ships now (not a resolution of the fork)

rather than a guess at force-vs-relax, the transform emits a `@declapract:review` marker via
`withProviderTimeoutReviewMarker` on the third shape: a still-red CONTAINS plan then carries an
actionable diagnostic that names the `timeout: 60` line and states that a non-default value is a
deliberate choice to reconcile by hand. this closes the SILENT-red half (the row-1 non-convergent
hazard the wish exists to kill) without a pick of either arm.

- the provider-vs-function ambiguity that once made this dirty is closed: the branches are
  line-anchored `/^ {2}timeout:/m` (2-space = provider-level), so a per-function 4-space
  `    timeout: N` is invisible to the anchor and never clobbered.

## rework, and why clean

the marker path is a bounded, reversible addition — a helper + one branch, guarded by tests. the
force-vs-relax call, once ruled, is a one-line change (either a value rewrite or a relaxed clamp
assertion), inherited by every consumer at the same seam. no caller is hardened against the marker,
so either resolution is a clean follow-on, never a teardown.

## where

- `src/practices/serverless/best-practice/serverless.yml.declapract.ts` — `withDefaultTimeout` +
  `withProviderTimeoutReviewMarker`
- `src/practices/serverless/serverless.yml.declapract.test.ts` — `given: a legacy serverless.yml whose
  provider timeout is a non-default value` (marker emitted, idempotent, 4-space not clobbered)

## verdict

open — the marker ships as the neutral middle; the wisher must rule force-vs-relax. the silent-red
half is closed. dream: `.dream/v2026_09_10.fix.serverless-soft-skip-convergence.md`.
