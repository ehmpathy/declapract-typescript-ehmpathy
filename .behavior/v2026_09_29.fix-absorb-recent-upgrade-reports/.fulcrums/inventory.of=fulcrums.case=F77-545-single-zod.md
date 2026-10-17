# F77 — #545: one zod copy in repos that never ran the joi fixer

- **fork:** (a) `pnpm.overrides.zod` = the exact sdk-aws-lambda pin (4.4.3), one constant shared
  with #654; (b) extend #654's exact direct pin to these repos alone.
- **taken:** (a). the override collapses transitive copies too, which is what OOMs tsc.
- **rework:** clean — one constant.
- **confidence 65%, low because:** an override pins every dep's zod, and a dep that needs another
  4.x minor would break.
- **where:** with #654/#624's bad-practice.
- **verdict:** —
