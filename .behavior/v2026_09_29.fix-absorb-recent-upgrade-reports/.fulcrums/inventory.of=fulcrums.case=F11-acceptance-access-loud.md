# F11 — #651: a local cloud acceptance run with no ACCESS throws

- **fork:** keep the silent `ACCESS ?? 'test'` fallback, or throw a ConstraintError when neither
  `ACCESS` nor `LOCALLY=true` is set outside ci.
- **taken:** throw, via a pure leaf `getOneKeyrackEnvForAcceptance({ env })` called from
  `jest.acceptance.prepare.ts`. the silent fallback is what sourced test keyrack over a prep target.
- **rework:** clean — the leaf is one file.
- **confidence 70%, low because:** the hang's root cause is unconfirmed (creds/fleet mismatch plus
  the v2 caller of #650 are the suspects); the loud throw fixes the class, and the upstream
  `git.repo.test` should also export ACCESS (issue filed on rhachet-roles-ehmpathy).
- **where:** `tests-node/best-practice/jest.acceptance.{env,prepare}.ts`.
- **verdict:** stands; the upstream ACCESS export is a caught dream, not a filed issue (seed S5).
