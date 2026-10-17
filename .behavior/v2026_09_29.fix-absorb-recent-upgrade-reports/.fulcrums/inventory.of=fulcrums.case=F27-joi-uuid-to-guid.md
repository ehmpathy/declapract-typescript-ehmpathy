# F27 — #629: `z.guid()`, backfill only in marker-carrier files

- **fork:** map `Joi.string().uuid()` to `z.guid()` in the fix chain; backfill already-migrated
  repos everywhere, only in files that still carry the joi `@declapract:review` marker, or not at all.
- **taken:** map to `z.guid()` (versioned uuid options map to `z.uuidv4()` / `z.uuid()`); backfill
  only in marker-carrier files. a blanket `z.uuid()` → `z.guid()` would loosen schemas an author
  chose strict on purpose.
- **rework:** clean — the map is one fix-chain step.
- **confidence 65%, low because:** a repo that removed the marker after its migration keeps the
  narrowed `z.uuid()`; it is the author's call to revisit.
- **where:** `runtime-schemas/bad-practices/joi/src/**/*.ts.declapract.ts:62-70`.
- **verdict:** —
