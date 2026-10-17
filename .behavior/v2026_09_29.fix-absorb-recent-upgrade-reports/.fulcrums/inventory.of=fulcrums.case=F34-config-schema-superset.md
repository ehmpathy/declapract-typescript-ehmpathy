# F34 — #658: config yields `config.schema.ts` to persist-with-rds via a superset check

- **fork:** (a) a usecase-aware EQUALS in config that emits the rds shape when persist-with-rds is in
  play; (b) config's schema checks for a superset of the base keys, and persist-with-rds' EQUALS
  owns the file.
- **taken:** (b). (a) is scope-sensitive: a narrow `--practice config` apply makes
  `projectPractices === ['config']`, so the branch goes dark and the fix strips the database block
  (`rule.avoid.runtime-forks` § caveat). (b) matches F6: one owner per file.
- **rework:** clean — one `.declapract.ts` beside the template.
- **confidence 80%, low because:** the superset check must parse a ts object literal; a regex over
  key names may be the honest bound.
- **where:** `config/best-practice/src/utils/config/config.schema.ts.declapract.ts`.
- **verdict:** —
