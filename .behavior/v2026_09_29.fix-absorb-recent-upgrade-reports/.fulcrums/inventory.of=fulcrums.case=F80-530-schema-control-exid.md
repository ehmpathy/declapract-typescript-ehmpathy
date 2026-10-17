# F80 — #530: sql-schema-control `id:` → `exid:`

- **fork:** (a) the `init.yml` template moves to `exid:`, and a bad-practice over
  `provision/schema/**/*.yml` rewrites only change entries; (b) template only.
- **taken:** (a). (b) never reaches the extant control files.
- **rework:** clean.
- **confidence 85%, low because:** a non-change `id:` key in a control yml must not be touched; the
  fix keys on the change entry shape.
- **where:** persist-with-rds `provision/schema/init.yml:2,7` + new bad-practice.
- **verdict:** —
