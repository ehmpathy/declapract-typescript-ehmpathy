# F5 — #638 held as a decision

- **fork:** land the object shape + a new `databaseClusterName` variable + the config/schema parse
  clamp now, or hold it.
- **taken:** hold. a new `@declapract{variable.*}` makes `plan` throw `Variable … was not defined`
  for every adopter of `persist-with-rds` that has not declared it, and #539/#562 prescribe the same
  field — to land one alone forks the fix.
- **rework:** clean — the variable, shape, and clamp are additive.
- **confidence 85%, low because:** the parse clamp alone (without the variable) could land now and
  would have caught #539; a narrower D1 slice exists.
- **where:** `persist-with-rds/best-practice/config/*.json`, `src/utils/config/config.schema.ts`.
- **verdict:** overruled by the wisher (seed S2) — land it this round. the variable-breaks-plan risk
  moves into the fix shape (a default or a fix fn that seeds it), best-guessed as a new fulcrum.
