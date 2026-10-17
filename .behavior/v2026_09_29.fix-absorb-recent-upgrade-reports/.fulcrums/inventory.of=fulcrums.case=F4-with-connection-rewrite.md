# F4 — #626: flag the migration, do not rewrite it

- **fork:** (a) a `src/**/*.ts` auto-rewrite of `withDatabaseConnection` → `withDatabaseContext`.
  (b) a real declaration that flags each importer and names the move, with no delete and no rewrite.
- **taken:** (b). the first draft chose (a) on the belief that both wrappers share `(input, context)`.
  `git show 6d2d436` refutes it: the old wrapper took `dbConnection` inside the **input**
  (`findById({ id, dbConnection })`); the new one takes it in the **context**. every op body
  destructure and every call site changes shape, so (a) breaks the build — the failure #626 reports.
- **rework:** clean — an auto-rewrite can be added later beside the flag, ideally shared with #635's
  identical shape move.
- **confidence 75%, low because:** a narrow subset (ops that never destructure `dbConnection` from the
  input) might be mechanically rewritable; the round does not measure that subset. and seed S2 asks
  for the latest shape immediately — a marker leaves ~13 sites per repo to move by hand, which the
  wisher may read as a deferral. the marker is kept because an unsafe rewrite breaks the build,
  which is the defect #626 itself reports; if the wisher wants the subset rewrite, it is additive.
- **where:** `persist-with-rds/bad-practices/with-connection-in-input/`.
- **verdict:** —
