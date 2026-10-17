# F59 — #685: a merge-by-job fix for provision.yml

- **fork:** (a) switch provision.yml to EQUALS with a whole-file fix, like deploy.yml; (b) a
  merge-by-job fix: each declared job is overwritten with its declared shape, adopter jobs kept, and
  a check that passes when every declared job matches.
- **taken:** (b). adopters add jobs to this caller by design (a CONTAINS superset), and under a
  narrow `--practice cicd-service` scope the `contents` fn emits the non-rds body — a whole-file
  write would strip the rds jobs. (b) overwrites only declared jobs; `rds-jobs-in-non-rds-service`
  still owns any strip, with its callee-on-disk guard.
- **rework:** clean — the fix fn is self-contained; the same helper serves #608.
- **confidence 75%, low because:** a yaml round trip can reflow comments inside a replaced job; the
  `Document` API keeps the rest.
- **where:** `cicd-service/best-practice/.github/workflows/provision.yml.declapract.ts`.
- **verdict:** —
