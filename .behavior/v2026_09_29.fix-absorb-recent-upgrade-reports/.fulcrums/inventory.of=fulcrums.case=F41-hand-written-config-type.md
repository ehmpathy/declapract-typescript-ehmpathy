# F41 — #661: delete `Config.ts` and repoint imports at `config.schema`

- **fork:** (a) delete and repoint; (b) flag with a review marker, no delete.
- **taken:** (a). the schema is the declared source of the type; a hand-written twin drifts. a field
  the schema lacks turns tsc red at the importer, so the gap is loud, not silent.
- **rework:** clean — (b) is a smaller fix fn.
- **confidence 60%, low because:** a red tsc after an apply is the B2 class this round exists to
  remove; (b) may fit the wish better.
- **where:** `config/bad-practices/hand-written-config-type/`.
- **verdict:** —
