# F76 — #548: the number half of joi→zod coercion

- **fork:** (a) add a `z.coerce.number()` bullet to the extant #594 review marker; (b) emit
  `z.coerce.*` in `src/domain.objects/` only.
- **taken:** (a). joi's coercion is call-site behavior a regex cannot see; a marker never breaks the
  build.
- **rework:** clean.
- **confidence 65%, low because:** a db-hydrated number stays uncoerced until a human reads it.
- **where:** `joi/bad-practices/**/src/**/*.ts.declapract.ts:31-32,64`.
- **verdict:** —
