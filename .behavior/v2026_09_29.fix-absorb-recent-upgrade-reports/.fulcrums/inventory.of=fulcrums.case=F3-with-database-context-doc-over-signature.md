# F3 — #633: fix the jsdoc, not the signature

- **fork:** (a) make the jsdoc example show the two-arg call that compiles. (b) default `context`
  so the documented one-arg call is real.
- **taken:** (a). (b) changes the signature every persistence op composes, needs a cast on the
  default, and the issue itself says the required `context` may be deliberate.
- **rework:** clean — (b) is additive later; callers that pass `{}` still compile.
- **confidence 70%, low because:** the wrapper's purpose is an implicit connection; (b) may be what
  the author meant, and 11 `{}` args per repo is real noise.
- **where:** `persist-with-rds/best-practice/src/utils/database/withDatabaseContext.ts`.
- **verdict:** —
