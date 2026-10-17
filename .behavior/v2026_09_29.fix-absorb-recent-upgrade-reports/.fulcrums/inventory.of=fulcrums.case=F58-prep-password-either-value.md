# F58 — #683: prep's password leaves accept either value

- **fork:** (a) a hard flip of `config/prep.json`'s three passwords to `__CHANG3_ME__`; (b) the
  prep.json check accepts `__CHANG3_ME__` or `$.at(aws::param)` at those leaves, and its fix
  deep-merges and keeps an extant password; the bad-practice drops its placeholder rewrite.
- **taken:** (b). the template's own `deploy.database.sh:92-98` and `user.service.sql:6` create prep
  users with the placeholder, so that must stay legal; but an adopter who seeded real prep secrets
  must not be flipped back. a shallow spread today also clobbers adopter keys under `database`; the
  deep merge closes that too.
- **rework:** clean — one check and one fix fn.
- **confidence 65%, low because:** the other view — prep should hold real params, and the absent
  params are #637's defect — is defensible; the either-value check serves both views.
- **where:** `persist-with-rds/best-practice/config/prep.json.declapract.ts`,
  `persist-with-rds/bad-practices/old-dev-config-location/config/dev.json.declapract.ts`.
- **verdict:** —
