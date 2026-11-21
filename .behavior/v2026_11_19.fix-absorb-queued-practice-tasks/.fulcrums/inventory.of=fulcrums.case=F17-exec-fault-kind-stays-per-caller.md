# F17 — the three exec fault classifiers stay per caller this release

## .the fork
- a: one `asExecFaultKind` in `tests-any`, each caller maps the kinds
- b: keep `asPsqlFaultKind`, `asExecFaultKind` (useKeyrack), `isWakeCommandFailure` per caller; catch a dream

## .taken
b. a adds a shipped file, and the absorb is bound to no new file beyond the route. each classifier serves one caller's issue (#787 #788 #784 #806) and each is clamped where it lives. the `ENOENT` split is a policy difference per tool, not a fault left unnamed: each path still fails loud.

## .rework
dirty. three shipped modules adopt a new import; adopters' extant copies change on the next apply.

## .confidence — 80%, why not higher
the reviewer's point is right on its merits; only the bound defers it.

## .where
`tests-node/best-practice/jest.integration.env.db.ts`, `useKeyrack.ts`, `useWakeOfLivedb.ts`; dream `v2026_11_19.reseed.one-exec-fault-kind-for-test-harness`

## .verdict
— (awaits review)
