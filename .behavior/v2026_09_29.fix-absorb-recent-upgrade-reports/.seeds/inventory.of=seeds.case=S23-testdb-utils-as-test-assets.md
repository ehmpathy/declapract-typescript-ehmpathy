# S23 — the testdb utils are test assets; the jest env declares a test-access port override

## .said

> this should be in a .test/assets/ dir; src/practices/persist-with-rds/best-practice/src/utils/database/getTestdbPort.ts

> all the testdb stuff

> test assets go into .test/assets dirs

> why dont we just have a port override mechanism that works only in prep environments

> yeah

> there you go

> you can do that port declaration via the jest.*.env.ts files

## .settled

- a test-only asset lives in a `.test/assets/` dir, never a prod path. the per-worktree testdb
  utils (`getTestdbIdentity`, `getTestdbPort`) are test assets.
- the prod db connection imports no testdb util. it reads one port override, and honors it only
  with test access — the access that reaches the local testdb. ("prep" in the words above named
  that local testdb; the gate was confirmed as test access.)
- a `jest.*.env.ts` file derives the worktree port and declares the override.

## .landed

- `P/persist-with-rds/best-practice/src/.test/assets/database/getTestdbIdentity.ts`, `getTestdbPort.ts`
- `P/persist-with-rds/best-practice/src/utils/database/getOneDatabasePort.ts`, `getOneDatabaseConnection.ts`
- `P/persist-with-rds/best-practice/provision/schema/connection.config.js`, `provision/docker/testdb/compose.sh`
- `P/tests-node/best-practice/src/.test/assets/database/useTestdbPortOverride.ts`
- `P/tests-node/best-practice/jest.integration.env.ts`, `jest.acceptance.env.ts`, `src/.test/useWakeOfTestdb.ts`
- `P/persist-with-rds/getOneDatabasePort.declapract.test.ts`, `P/tests-node/testdb-port-override.declapract.integration.test.ts`
- `rule.forbid.test-assets-in-src.md` names `src/.test/assets/` as the home; `rule.forbid.copium.md` example 2
- F106, F108, F111
