# F27 — the pg factory's real-postgres call lives in the consumer suite, not here

## .the fork
- (a) add `pg` as a devDependency of this repo, start a real postgres, and run the shipped `getOneDatabaseConnection` against it
- (b) keep the factory's retry branches on a stand-in Client here; prove the real server faults through a real `psql` against a real dockerized postgres, and leave the real `pg` call to the consumer suites that already make it

## .taken — (b)
- this repo ships the factory as a template; it never runs it. every service that adopts `persist-with-rds` runs its integration suite through `getOneDatabaseConnection` against its own real testdb, every upgrade
- `pg` is no dependency here today. a devDependency added for one test, plus the paved installer's reason file under `.route/`, is a new tracked file the director's bound forbids
- the real-server faults the factory classifies (refused, auth `28P01`) are proven here by real `psql` against real postgres (`jest.integration.env.db` real-call cases); the stand-in covers only the retry order, which a real server cannot be made to emit on cue (`ECONNRESET`, `53300` in the first 5s)

## .rework — clean
add `pg` as a devDependency and one `given` in `database-client.declapract.integration.test.ts` that passes the real `pg` to the require stub; no caller or contract changes

## .confidence — 72%
low because the reviewer's rule asks for a real call in THIS suite, and a consumer suite is a proof one hop away

## .where
`src/practices/persist-with-rds/database-client.declapract.integration.test.ts` [case5]

## .verdict
open — fulcrum council at the end of the route
