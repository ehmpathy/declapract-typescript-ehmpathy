# F37 — #664: the testdb pg pin as a check, no fleet-wide bump

- **fork:** (a) bump the testdb image to the live cluster's major for every adopter; (b) a check
  that the testdb major matches the declared engine major, and flags drift.
- **taken:** (b). adopters run different engine majors; one bump would move some testdbs off their
  live cluster's major.
- **rework:** clean — the check reads one variable.
- **confidence 65%, low because:** the engine major may not be a declared variable today; it may
  need a new one.
- **where:** `persist-with-rds/best-practice/provision/docker/integration-test-db/`.
- **verdict:** —
