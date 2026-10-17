# F26 — #624: an override-undercuts bad-practice

- **fork:** declare `pnpm.overrides.zod` with `minVersion(...).ifInstalled()` in a best-practice, or
  a pnpm bad-practice that detects any `pnpm.overrides[x]` below `dependencies[x]` and raises it.
- **taken:** the bad-practice, plus runtime-schemas' zod floor raised to 4.0.0 (both practices sit
  only in lambda-service, so it narrows no one). declapract 0.13.26 writes the literal
  `@declapract{…}` into an adopter whose `pnpm` key is absent, so the declarative route is broken
  until core changes.
- **rework:** clean — one bad-practice.
- **confidence 75%, low because:** an override deliberately lowered to settle version contention is
  raised; that override already undercut the practice floor.
- **where:** `pnpm/bad-practices/override-undercuts-dependency/package.json.declapract.ts` (new).
- **verdict:** —
