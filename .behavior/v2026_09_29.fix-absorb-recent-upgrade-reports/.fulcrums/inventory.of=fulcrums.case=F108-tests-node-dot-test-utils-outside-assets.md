# F108 — the tests-node `src/.test/*.ts` utils sit outside `src/.test/assets/`

- **fork:** `rule.forbid.test-assets-in-src` now names `src/.test/assets/` as a test-only asset's
  home (S23). the tests-node practice ships `src/.test/useKeyrack.ts`, `useWakeOfLivedb.ts` and
  `useWakeOfTestdb.ts` directly under `src/.test/`. (a) move them in this round; (b) leave them and
  catch the move as a dream.
- **taken:** (b), as of this record. a move rewrites the declared paths of three shipped utils and
  their importers (`jest.*.env.ts`, `jest.*.prepare.ts`) in every adopter, which owes a relocation
  bad-practice and its integration test. the testdb utils of persist-with-rds land at
  `src/.test/assets/` now (new this round, never shipped).
- **does it conform:** no — they are test-only (only jest envs and globalSetups import them), and
  they sit in `src/.test/`, not `src/.test/assets/`. they satisfy the rule's older shape (a dot-dir
  inside `src/`, out of every prod path), so no prod path ships them.
- **measured:**
  - `useWakeOfTestdb.ts` and `jest.integration.env.db.ts` (`probeTestDb`) have shipped; their
    last commit is `b8d4803`. both stay in place this round.
  - `useWakeOfTestdb.ts` now probes `TESTDB_PORT`, else the declared port, so it no longer loads
    the persist-with-rds util.
  - `jest.integration.env.db.ts` sits at the template root, outside `src/`, which the revised rule
    also flags.
- **deferred:** the relocation of all four (`useKeyrack`, `useWakeOfLivedb`, `useWakeOfTestdb`,
  `jest.integration.env.db.ts`) to `src/.test/assets/` is a migration with its own bad-practice.
  it is caught as a dream: `dreams/v2026_10_17.fix.tests-node-test-utils-into-test-assets.md`.
- **rework:** dirty — a relocation across every adopter.
- **confidence:** 70%. that "all the testdb stuff" meant the shipped tests-node utils too is still
  open, but the deferral costs no adopter a leak: no prod path ships them.
- **where:** `src/practices/tests-node/best-practice/src/.test/`, `jest.integration.env.db.ts`.
- **verdict:** —
