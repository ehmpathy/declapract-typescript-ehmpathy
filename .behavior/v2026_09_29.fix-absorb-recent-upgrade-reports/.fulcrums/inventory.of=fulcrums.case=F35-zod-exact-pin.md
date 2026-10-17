# F35 — #654: the joi fixer pins zod 4.4.3 exact

- **fork:** (a) a `^4` range; (b) the floor 4.0.0; (c) the exact pin sdk-aws-lambda 0.7.1 carries.
- **taken:** (c) 4.4.3. sdk-config pins 4.3.6 and sdk-aws-lambda pins 4.4.3; the higher pin yields
  one zod identity in a repo that holds both. pinned versions are the house rule
  (`rule.require.pinned-versions`).
- **rework:** clean — one string.
- **confidence 70%, low because:** a later sdk bump moves the pin, and this fixer would then lag.
- **where:** `runtime-schemas/bad-practices/joi/package.json.declapract.ts`.
- **verdict:** —
