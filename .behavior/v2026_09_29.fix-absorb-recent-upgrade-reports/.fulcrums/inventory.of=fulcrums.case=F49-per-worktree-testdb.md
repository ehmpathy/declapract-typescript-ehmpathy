# F49 — #674: a per-worktree testdb via an override in code; `7821` stays the ci default

- **fork:** (a) a shared `getTestdbPort()` override that the three port readers apply under test
  access; (b) a state file written by `start:testdb` and read by each reader; (c) a new sdk-config
  env supplier (work in another repo, S5).
- **taken:** (a). (c) is out of reach this round; (b) adds a file each reader must find. the suffix
  is a short hash of the repo toplevel; where none derives (ci), the port stays `7821`, so a single
  checkout and ci behave as today.
- **rework:** clean — one util and three call sites.
- **confidence 55%, low because:** the `git.repo.test` skill (rhachet-roles-ehmpathy) starts the
  testdb too, and may need the same derivation; not verified.
- **where:** `persist-with-rds/best-practice/provision/docker/testdb/`, `package.json`, the port readers.
- **verdict:** —
