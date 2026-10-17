# F40 — #659: delete the retired template only on a body match

- **fork:** (a) EXISTS + delete, whatever the body; (b) delete only when the body matches the old
  template; an edited copy is flagged and kept.
- **taken:** (b). an adopter may have edited the old file; (a) would drop that edit silently.
- **rework:** clean — a match fn over normalized whitespace.
- **confidence 80%, low because:** a biome-formatted copy may differ from the template bytes; the
  match must tolerate format drift.
- **where:** `persist-with-rds/bad-practices/old-get-database-connection/`.
- **verdict:** —
