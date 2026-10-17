# F48 — #673: readonly mode is a session guard; the default stays `readwrite`

- **fork:** (a) a required `mode` input; (b) a default-object input `{ mode: 'readwrite' }`, so extant
  no-arg callers keep their behavior.
- **taken:** (b), per the `getConfig` default-object precedent. readonly uses the plan grant, the
  `for-plan` role, and `SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY`. that session mode is
  a guard a caller can reset; the real boundary is a SELECT-only `for-plan` db user, which each
  adopter's schema sql owns. the jsdoc says so.
- **rework:** clean.
- **confidence 75%, low because:** whether a KMS denial on the crud param reads as
  `SupplyDeniedError` under the plan grant is unverified; it is checked at execution.
- **where:** `persist-with-rds/best-practice/src/utils/database/getOneDatabaseConnection.ts`.
- **verdict:** —
