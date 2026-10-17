# F54 — #679: rename test files to `._.{acpt,intg,unit,eval}` at org scale

- **fork:** (a) jest configs match the new suffixes only, no rename; (b) configs match both forms,
  plus a rename bad-practice per kind that moves the paired `.snap`; (c) hold for a wisher call.
- **taken:** (b). S2 forbids a hold for size; (a) leaves two names for one concept forever. both
  suffix forms stay matched while any file carries the old one, so no test drops silently.
- **rework:** dirty — once adopters rename their files, a reversal is a second rename across every
  repo, and `rhx git.repo.test` keys on the names too (a reseed).
- **confidence 55%, low because:** the `._.` seam and the four-letter kinds are an org-scale name
  choice that the issue proposes and no wisher has confirmed.
- **where:** `tests-node` and `tests-expo` jest configs; the `tests-any` and `tests-service`
  declarations; a new `tests-any/bad-practices/old-test-suffix/`.
- **verdict:** overruled by the wisher (seed S11) → (a), forwards compat. jest configs and the
  name-keyed declarations accept both suffix forms; no rename bad-practice ships; no old suffix drops.
