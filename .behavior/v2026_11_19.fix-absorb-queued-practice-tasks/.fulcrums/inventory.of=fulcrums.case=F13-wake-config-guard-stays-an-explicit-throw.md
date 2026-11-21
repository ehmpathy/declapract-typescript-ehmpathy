# F13 — the testdb wake narrows its config with an explicit guard, not an `.assure`

## .the fork
- a: `assure(config, isTestConfigComplete)` via `type-fns`, per `rule.require.assure-via-type-checks`
- b: keep `if (!isTestConfigComplete(config)) throw new ConstraintError('…the keys to declare…', { testConfigPath })`

## .taken
b. the guard's message IS the fix: it names every key to declare and the file. a generic assure throws a type-guard failure with no domain fix. the template imports `helpful-errors` only; an `assure` would add `type-fns` to every adopter's jest setup for one call.

## .rework
clean. one line in `useWakeOfTestdb.ts`, plus a dependency floor if `type-fns` joins.

## .confidence — 85%, why not higher
`withAssure` can carry a custom message; a reviewer may hold that it serves both ends.

## .where
`src/practices/tests-node/best-practice/src/.test/useWakeOfTestdb.ts`

## .verdict
— (awaits review)
