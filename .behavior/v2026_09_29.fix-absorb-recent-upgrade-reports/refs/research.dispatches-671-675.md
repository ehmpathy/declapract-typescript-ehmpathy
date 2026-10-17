# research — dispatches #671–#675 (seed S8)

a read-only sweep read each issue and verified it against this tree on 2026-10-07. paths are under
`src/practices/`.

## #671 — old-import-paths' check passes a bare `@src/domain` import

- **verdict:** confirmed. every check pattern needs a `/` after the dir name, so a bare barrel import
  (`'@src/domain'`, `'../../domain'`) matches none; `plan` is silent and the fix never runs.
- **evidence:**
  - `directory-structure-src/bad-practices/old-import-paths/src/**/*.ts.declapract.ts:6-17` —
    `OLD_PATH_PATTERNS`, each needs a sub-path or a slash after the dir; `:33-38` the check returns
    on a match;
  - same file `:45-64` — the fix's replace chain has the same shape (`:52` `\/domain\//`);
  - a latent hazard: `[^'"]*\/data\//` (`:9`, `:49`) also matches a package subpath `'some-pkg/data/x'`.
- **fix (C3):** with #655, in one commit — a bare-dir alternative for `domain`, `data`, `logic`,
  `model`, `services` that ends at the quote, restricted to relative and `@src/` specifiers, added to
  **both** the check and the fix. map domain/model → `domain.objects`, data → `access`,
  logic/services → `domain.operations`. a fixture per dir, alias and relative forms; an idempotency
  case (`'@src/domain.objects'` never re-matches); a clamp that fails when one list catches a fixture
  the other misses.
- **class / care:** B3 + B2 · crit (svc-quotes: one tsc error per importer, 80 files).
- **call:** the check covers exactly the specifier set the fix can rewrite (F46).

## #672 — drop `npx` from the `provision:schema:*` commands

- **verdict:** confirmed. `npx` on a local devDep under `pnpm run` makes npm print "Unknown env
  config" warnings.
- **evidence:**
  - `persist-with-rds/best-practice/package.json:15-20` — `npx sql-schema-control …`, `npx` on the
    generate commands; `:7-10` all four tools are devDependencies;
  - `package.json.declapract.ts:3` — CONTAINS; core's default JSON fix replaces a mismatched value;
  - the same shape sits in `persist-with-dynamodb:9`, `artifact:6`, `lint:14`,
    `conventional-commits:3-4`, `serverless:8-10`, `typescript-expo:4`,
    `cicd-app-react-native-expo:8-23`.
- **fix (C2):** template values only; the extant CONTAINS fix converges each key.
- **class / care:** B5 · alt. side benefit: an absent dep fails loud instead of a registry fetch.
- **call:** drop `npx` only where the practice itself declares the bin (F47).

## #673 — `getOneDatabaseConnection` takes a readonly plan-grant mode

- **verdict:** confirmed (feature).
- **evidence:**
  - `persist-with-rds/best-practice/src/utils/database/getOneDatabaseConnection.ts:42-46` — no input,
    `getConfig()`, `role.crud`; `:70-71` only `SET search_path`;
  - `config/best-practice/src/utils/config/getConfig.ts:47-59` — `getConfig({ grant: 'plan' })` exists;
  - `persist-with-rds/best-practice/src/utils/config/config.schema.ts:63` — `role.cicd['for-plan']`
    required under both grants; crud passwords are `secret()`, optional under plan;
  - `provision/schema/connection.config.js:13-14` — the `GRANT` precedent.
- **fix (C1):** `(input: { mode: 'readwrite' | 'readonly' } = { mode: 'readwrite' })`; readonly →
  plan grant, `for-plan` role, `SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY`. integration
  cases: a readonly write rejects; readwrite unchanged. lands with #664 (same file).
- **class / care:** B7 · alt.
- **call:** the read-only session is a guard, not a boundary (F48).
- **open:** whether sdk-config's param-store supplier classifies a KMS decrypt denial as
  `SupplyDeniedError` (tolerated under `.optional()`). verified at execution; a transient
  classification would throw under plan grant.

## #674 — the testdb container and port are shared by every worktree

- **verdict:** confirmed, and wider: repos collide too, not only worktrees.
- **evidence:**
  - `persist-with-rds/best-practice/provision/docker/testdb/docker-compose.yml:7,10` —
    `container_name: @declapract{variable.databaseName}`, a fixed `7821:5432` for every adopter;
  - `config/test.json:26-28` — `tunnel.local` is `localhost:7821`;
  - `package.json:21` — `provision:testdb:docker:clear` removes any container on the compose ports;
  - `package.json:23,25` — no `-p`, so the compose project defaults to `testdb` in every repo;
  - `config/test.json.declapract.ts:3,9-12` — CONTAINS with a top-level spread.
- **fix (C1 + C2):** a per-worktree suffix (short hash of the repo toplevel); `-p <db>-<suffix>` on
  every compose call; a suffixed `container_name`; a derived host port via `${TESTDB_PORT}`; the
  clear command scoped to that port. the three port readers (`getOneDatabaseConnection`,
  `connection.config.js`, the tests-node preflight) share one `getTestdbPort()` override under test
  access. `7821` stays the default where no suffix derives (ci).
- **class / care:** B5 · alt.
- **call:** an override in code, not a new sdk-config supplier (F49).
- **overlaps:** #664 (same compose file) and #638 (`test.json` tunnel).

## #675 — `jest.acceptance.env.ts` must align `CONFIG` to `ACCESS`

- **verdict:** partly. the defect is real; the "prior template had this block" claim is refuted —
  the pre-b8d4803 template set no `CONFIG` either.
- **evidence:**
  - `tests-node/best-practice/jest.acceptance.env.ts:36` — `useKeyrack({ env: process.env.ACCESS ??
    'test' })`, no `CONFIG`;
  - `tests-node/best-practice/src/.test/useKeyrack.ts:180,190` — returns early in ci; sets `ACCESS`
    only off test; never `CONFIG`;
  - `environments/best-practice/src/utils/environment.ts:5` — `envStatic` is cached at module load;
    `config/best-practice/src/utils/config/getConfig.ts:17` reads it;
  - sdk-environment: prep access + `NODE_ENV=test` resolves config `test`; an explicit `CONFIG` wins.
    so the defect bites a prep cloud run.
- **fix (C1):** set `process.env.ACCESS` and `process.env.CONFIG` to `ACCESS ?? 'test'` before
  `useKeyrack`, so ci (where useKeyrack returns early) is covered too. clamp: prep access +
  `NODE_ENV=test` resolves config `prep`, red without the line.
- **class / care:** B1 · crit (a prep acceptance request built from config fails, e.g. a twilio
  signature).
- **call:** the alignment stays in the env file even after #623 moves useKeyrack to globalSetup (F50).
- **overlaps:** #651 (derives the acceptance env from ACCESS; sets no CONFIG), #623, #611/#612.
