# F43 — #669: the evaluation job is always present, gated on a presence step

- **fork:** (a) a usecase-aware job, emitted only where a `test:evaluation` entry exists; (b) the job
  is always present; a first step reads `package.json` for `test:evaluation`, and every later step
  runs only where it is declared.
- **taken:** (b). `.test.yml` is EQUALS; a usecase-aware EQUALS is scope-sensitive
  (`rule.avoid.runtime-forks` § caveat). the presence gate skips auth, testdb, and build where no
  evaluation suite exists, so the job costs one checkout. the last step keeps `--if-present` as a
  second guard.
- **rework:** clean.
- **confidence 75%, low because:** an always-green job may read as coverage that is absent; the
  skipped steps show as skipped in the run, which softens that.
- **where:** `cicd-common/best-practice/.github/workflows/.test.yml`.
- **verdict:** —
