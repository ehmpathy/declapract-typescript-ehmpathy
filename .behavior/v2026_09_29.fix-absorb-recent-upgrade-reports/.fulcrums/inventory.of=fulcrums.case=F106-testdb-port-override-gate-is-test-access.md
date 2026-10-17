# F106 — the testdb port override is honored only with test access

- **fork:** the prod connection dials a per-worktree testdb port. (a) keep the import of the
  testdb util in `getOneDatabaseConnection` (git + `child_process` in the artifact); (b) a port
  override the jest env declares, honored only with test access; (c) the same override, gated on
  prep access.
- **taken:** (b). the per-worktree testdb is the local db reached with test access; prep access
  reaches the deployed prep cluster, where a port override has no use. the wisher's ask named
  "prep"; the gate was read as test access, and the wisher confirmed it (S23).
- **why not (a):** the artifact would ship test machinery to cope with a test need
  (`rule.forbid.copium`, `rule.forbid.test-assets-in-src`).
- **rework:** clean — one condition in the connection.
- **confidence:** 95%, confirmed by the wisher.
- **where:** `getOneDatabaseConnection.ts`, the `jest.*.env.ts` that declares the override.
- **landed:**
  - `src/utils/database/getOneDatabasePort.ts` reads `TESTDB_PORT`, and honors it only when
    `access === 'test'`. it is pure: no git, no `child_process`.
  - under any other access it returns the declared port, even where the override is malformed.
  - under test access, an empty or absent override gives the declared port. a value that is not a
    port in 1–65535 throws a `ConstraintError` with a hint.
  - `getOneDatabaseConnection.ts` dials it and imports no test asset.
  - the tests-node step `useTestdbPortOverride()` declares the override. `jest.integration.env.ts`
    calls it, and so does `jest.acceptance.env.ts` under test access.
- **teeth:** with the `access !== 'test'` gate commented out, 3 of the 11 clamp tests went red:
  prep ignores the override, prod ignores the override, and a malformed value under prod does not
  throw. with the gate restored, 11/11 pass.
- **verdict:** ruled (b), test access.
