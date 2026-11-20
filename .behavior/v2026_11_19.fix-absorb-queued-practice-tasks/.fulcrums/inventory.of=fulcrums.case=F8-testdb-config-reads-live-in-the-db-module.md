# F8 — the shared test-config transformers live in `jest.integration.env.db.ts`

## .the fork
- a: a new shipped file per transformer (`asTestConfigFromFile.ts`, …), one operation per file
- b: export them from `jest.integration.env.db.ts`, the db preflight module both setup files already reach

## .taken
b. `useWakeOfTestdb` already imports `probeTestDb` from that module, so it is the extant home of the testdb preflight. (a) adds new files to every adopter repo, and new files beyond the route's scope were ruled out. the config read belongs to the preflight's own domain, so the module stays cohesive.

## .rework
clean. a later split into one file per transformer is a move plus two import edits.

## .confidence — 80%, why not higher
the module now exports five operations, against `rule.require.single-responsibility`. a reviewer may grade that a blocker.

## .where
`src/practices/tests-node/best-practice/jest.integration.env.db.ts`; importers `src/.test/useWakeOfTestdb.ts`, `src/.test/assets/database/useTestdbPortOverride.ts`

## .disputes that cite this fulcrum
- arch-opport-decomposition i001 blocker.2, arch-smell-scopeleaks i001 nitpick.1 — the split this fulcrum weighs
- arch-opport-decomposition i001 nitpick.1 carries this path in its record by a slip; its argument is F12 (`inventory.of=fulcrums.case=F12-probe-stub-shape-stays-named.md`), as its `.taken` states

## .verdict
— (awaits review)
