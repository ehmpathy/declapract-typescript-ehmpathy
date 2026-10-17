# F96 — the fix-coverage harness's null-only bad-practice gap is dreamed, not closed

## .the fork

`practiceFixCoverage` feeds a bad-practice with no plain template only `fix(null)`, so its
idempotency and check-settles assertions hold trivially for ~25 declarations.

- A: close it here — a sample input per declaration, a harness convention, a ratchet ledger
- B: close it for every declaration THIS route touched, with per-file twice-applied unit tests and
  executeApply integration tests; dream the harness change

## .taken — B, and why

A touches ~25 practices this route never opened and adds a convention to the harness. that ripples
past the diff, so it fails CLEAN (`rule.always.fix-forward-under-scouts-honor`). B delivers the
guarantee where this route owes it — every fix it changed — and the dream
(`.dream/v2026_10_14.fix.practice-fix-coverage-null-only-bad-practices.md`) holds the shape of A.

## .rework

dirty to reverse into A here: a new harness convention plus per-practice samples. but A stays
available as its own route at any time; B leaves no debt that blocks it.

## .confidence — 80%

the call rests on S2 (zero deferrals for SIZE). this deferral is for ripple, not size; a wisher who
reads S2 as "zero deferrals of any kind" would rule for A.

## .where

- `src/practiceFixCoverage.declapract.integration.test.ts` case2 candidate list
- the census in `review/self/for.5.1.execution.from_vision._.role-standards-coverage.md`

## .verdict

open — for the fulcrum council.
