# F50 — #675: CONFIG/ACCESS alignment lives in the acceptance env file

- **fork:** (a) move the alignment into `jest.acceptance.prepare.ts` with useKeyrack (#623);
  (b) keep it in `jest.acceptance.env.ts`, per worker, before any test imports `environment`.
- **taken:** (b). `envStatic` is cached at module load, so the value must be set before the first
  import in each worker; the env file is the place that guarantees it. it duplicates no line if
  useKeyrack moves out.
- **rework:** clean — two lines.
- **confidence 65%, low because:** if globalSetup env reaches every worker before import, (a) is
  equivalent and keeps keyrack and config in one place.
- **where:** `tests-node/best-practice/jest.acceptance.env.ts`.
- **verdict:** —
