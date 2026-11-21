# F18 — the wake reads the testdb port from TESTDB_PORT this release

## .the fork
- a: `useTestdbPortOverride` returns the port; `useWakeOfTestdb({ port })` takes it, so call order is a type
- b: keep TESTDB_PORT as the one wire; catch a dream

## .taken
b. TESTDB_PORT is the channel the app itself dials under test access, so the wake probes exactly what the app will dial; a returned value would be a second channel the app never reads. a changes two shipped call contracts no issue asked to change. the line order in `jest.integration.env.ts` ships as one EQUALS template, so an adopter does not hand-order it.

## .rework
dirty. two shipped call contracts change; an adopter's own call sites follow.

## .confidence — 78%, why not higher
a hand-edited `jest.integration.env.ts` (a repo that left the template) could swap the lines and probe the declared port with no error.

## .where
`tests-node/best-practice/jest.integration.env.ts`, `src/.test/useWakeOfTestdb.ts`, `src/.test/assets/database/useTestdbPortOverride.ts`; dream `v2026_11_19.reseed.testdb-port-one-wire`

## .verdict
— (awaits review)
