# F24 — #634: `.contract()` rewrite homed in `domain`, never emits `.ref()`

- **fork:** home the `X.schema` → `X.contract()` bad-practice in `domain` or `node-service`; emit
  `.contract()` only, or also `.ref(by)`.
- **taken:** `domain` (it owns the domain-objects floor, 0.34.0); `.contract()` only — `.ref(by)`
  needs `static <by>` on the dobj, which is a design choice, so a second bad-practice detects a
  `.ref(by)` without the static and inserts `static primary = ['uuid']` only when a `uuid` field
  exists, else stamps a marker.
- **rework:** clean — a directory move.
- **confidence 70%, low because:** the check scans `src/contract/**`, which node-service owns; a
  reader may look there first.
- **where:** `domain/bad-practices/{schema-over-contract,ref-without-static-key}/` (new).
- **verdict:** half ruled (S19) — `schema-over-contract` stays in `domain`; the second bad-practice
  (`.ref(by)` without the static) leaves this repo, a lint or type guard for ehmpathy/domain-objects
  to own.
