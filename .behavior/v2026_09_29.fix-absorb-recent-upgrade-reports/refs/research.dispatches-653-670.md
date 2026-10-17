# research — dispatches #653–#670 (seed S7)

a read-only sweep read each issue and verified it against this tree on 2026-10-05. it cited each
line it read. the paths below are under `src/practices/`.

## #653 — expo cold start sets no env, so a cold build hits the prod api

- **verdict:** partly. the gap is real, but the template's vocabulary is `ACCESS=prep|prod` and
  `start:*:prep`, not the `STAGE=dev` the adopter's own file carries.
- **evidence:**
  - `cicd-app-react-native-expo/best-practice/package.json`: `:9` and `:12` hot scripts set
    `ACCESS=`; `:16` and `:19` cold scripts set none;
  - `typescript-expo/best-practice/package.json:4`: `build:web` sets no env.
- **fix (C2):** prefix each cold build with the same `ACCESS=` as its hot twin, plus a test that
  pairs each `start:cold:<env>` with its `start:hot:<env>`. this overlaps #620, which fixes the same
  cold scripts.
- **class / care:** B1 · alt.
- **call:** the template speaks `ACCESS`. a repo whose app still reads `STAGE` is the
  stage→access retirement's concern (`rule.forbid.stage-term`), not this fix's.

## #654 — the joi fixer adds `zod ^3.24.0` beside sdk-aws-lambda's zod 4

- **verdict:** confirmed.
- **evidence:**
  - `runtime-schemas/bad-practices/joi/package.json.declapract.ts:13` adds `'^3.24.0'`;
  - `runtime-schemas/best-practice/package.json:3` floors at `3.24.0`;
  - `config/best-practice/package.json:5` floors at `4.0.0`;
  - `sdk-aws-lambda@0.7.1` pins `zod 4.4.3`.
- **fix (C2):**
  - the fixer adds an exact v4 pin (`4.4.3`);
  - the runtime-schemas floor rises to v4, which #624 already lifts to `4.0.0`.
- **class / care:** B1 · crit.
- **call:** sdk-config pins `4.3.6` and sdk-aws-lambda pins `4.4.3`, so the fixer pins `4.4.3` (the
  higher). the #624 override bad-practice keeps every zod identity at or above the floor.

## #655 — domain-dir maps two barrels onto one path; old-import-paths misses the bare `/domain` import

- **verdict:** confirmed.
- **evidence:**
  - `directory-structure-src/bad-practices/domain-dir/src/**/domain/**/*.declapract.ts`:
    - `:9-11` map both `domain/index.ts` and `domain/objects/index.ts` to
      `domain.objects/index.ts`;
    - `:46` strips the `./objects` re-export, which leaves the outer barrel empty;
  - `old-import-paths/src/**/*.ts.declapract.ts`:
    - `:10-11` and `:51-52` need a `/` after the dir name, so a bare `'../domain'` is missed;
    - `/data`, `/logic`, `/model` and `/services` share the gap.
- **fix (C3):**
  - an outer barrel that holds only `export * from './objects'` (and comments) is deleted
    (`contents: null`), so the inner barrel alone owns the target;
  - old-import-paths gains a bare-dir pattern, restricted to relative and `@src/` specifiers so a
    package subpath (`'some-pkg/data'`) never matches;
  - a fixture holds both barrels.
- **class / care:** B2 + B3 · crit.

## #656 — config's getConfig imports two cache packages that config never declares

- **verdict:** confirmed.
- **evidence:**
  - `config/best-practice/src/utils/config/getConfig.ts:5` imports `simple-in-memory-cache`;
  - `getOneCacheDirectory.ts:2` imports `simple-on-disk-cache`;
  - `config/best-practice/package.json:2-6` declares neither;
  - in `cache/best-practice/package.json:3-4` both are `.ifInstalled()`.
- **fix (C2):** config declares `simple-in-memory-cache >= 0.5.1` and `simple-on-disk-cache >= 1.8.1`
  (both published). a repo-wide clamp asserts that every bare import in a best-practice template is
  declared by a package.json in the same practice — the clamp #642's class lacked too.
- **class / care:** B1 · crit.

## #657 — the test-fns floor reads devDependencies only, so a stale `dependencies` copy wins

- **verdict:** confirmed.
- **evidence:**
  - `tests-any/best-practice/package.json:7` floors `devDependencies.test-fns` (CONTAINS);
  - no declaration detects a cross-section duplicate;
  - precedent: `rhachet/bad-practices/prod-deps/package.json.declapract.ts:64-87`.
- **fix (C3):** a tests-any bad-practice detects a dev-only tool (test-fns, jest, @jest/globals,
  tsx, esbuild-register) in `dependencies` as well as `devDependencies`, and drops the
  `dependencies` copy. a test proves it converges.
- **class / care:** B3 · crit.
- **call:** the fix is scoped to the declared dev-only tool list, not to every duplicate, so a
  genuine runtime dep is never dropped.

## #658 — config and persist-with-rds both declare `config.schema.ts`, and the base won

- **verdict:** confirmed.
- **evidence:**
  - `config/best-practice/src/utils/config/config.schema.ts` and
    `persist-with-rds/best-practice/src/utils/config/config.schema.ts` are both EQUALS (no
    `.declapract.ts`) for one path;
  - `useCases.yml:57,71-77` puts both in lambda-service-with-rds.
- **fix:** this is #630's multi-declarer class, so it takes #630's rule (F6) — one owner per file:
  - config's schema gets a `.declapract.ts` whose check passes on any file that holds the base keys
    (a superset). it is never usecase-aware EQUALS, since a narrow `--practice config` apply would
    then strip the database block (`rule.avoid.runtime-forks` § caveat);
  - persist-with-rds' EQUALS template owns the file;
  - the #630 multi-declarer clamp gains this path.
- **class / care:** B4 → B1 · crit.

## #659 — persist-with-rds leaves the old getDatabaseConnection template behind

- **verdict:** confirmed. root: b8d4803 (#605) renamed the template, and no bad-practice retires the
  old file.
- **fix (C3):** an `old-get-database-connection` bad-practice:
  - EXISTS check, and the fix deletes the file only when its body matches the old template;
  - a src rewrite moves `getDatabaseConnection` imports to `getOneDatabaseConnection`.
- **class / care:** B4 · crit.
- **call:** delete only on a template match, so an adopter's hand-edited copy is never dropped.

## #660 — retired dev tools linger after the upgrade

- **verdict:** partly.
- **fix (C3 + C2):**
  - bad-practices remove `@tsconfig/node-lts-strictest`, and remove `ts-node` only when no file uses it;
  - `deprecated-test-deps` becomes a check fn that matches any listed key in either section;
  - the serverless floor drops `if-env`, and a removal bad-practice retires it.
- **class / care:** B3 + B1 · crit.

## #661 — the hand-written Config type survives beside config.schema

- **verdict:** confirmed.
- **fix (C3):** a config `hand-written-config-type` bad-practice: EXISTS, the fix deletes
  `src/utils/config/Config.ts`, and a src rewrite points imports at `config.schema`.
- **class / care:** B4 · alt.

## #662 — uni-time identifiers survive the iso-time swap

- **verdict:** confirmed.
- **fix (C3):** rename each `Uni*` identifier to its `Iso*` twin from iso-time's migration table. it
  lands with #642 in one commit, since #642 swaps the package.
- **class / care:** B2 · crit.

## #663 — the bottleneck fix pins a with-bottleneck that carries the bug

- **verdict:** confirmed. the test asserts the buggy 2.19.5 shape.
- **fix (C2):** pin `with-bottleneck` 0.1.2; keep `bottleneck` while src still imports it; fix the test.
- **class / care:** B1 · crit.

## #664 — persist-with-rds drift: healthcheck db, dialect, timeouts, major upgrade

- **verdict:** confirmed, five gaps.
- **fix (C1 + C2):**
  - healthcheck `-d @declapract{variable.databaseName}`;
  - `dialect` updated in control.yml and codegen.sql.{schema,types}.yml (EQUALS), and in
    codegen.sql.dao.yml (CONTAINS), which needs a fix fn;
  - client timeouts: connect 20s, query 30s;
  - the testdb pin as a check, not a fleet-wide bump (F37).
- **not shipped:** the `after_major_upgrade.sql` ask. the repo that performs the major cutover,
  ahbode/infrastructure, already owns and runs its post-upgrade ops (F105).
- **gap 5:** the version-skew ci job needs `rds:DescribeDBClusters` in each adopter's IAM. that grant
  lives in adopter repos, so the job is held behind a dream (F38).
- **class / care:** B1 + B7 · alt.

## #665 — jest and depcheck drift

- **verdict:** confirmed; a duplicate of #647 (jest ×6) and #639 (depcheck `ignore-patterns`, via a
  fix fn that findserts).
- **class / care:** B5 · alt. closes with #647 and #639.

## #666 — blackbox tests escape lint, and still import simple-lambda-testing-methods

- **verdict:** confirmed.
- **fix (C2):** biome includes `**/blackbox/**/*.ts`, plus `noRestrictedImports` that bans
  `simple-lambda-testing-methods`. it ships with #650: the tests-service acceptance check and the
  tests-any `old-acceptance-test-utils(-2/-3)` fixes retarget to `runLambdaEndpoint.onSerialized`.
- **class / care:** B3 + B7 · crit.
- **coupled:** sdk-aws-lambda#51 (see below).

## #667 — the scheduled_tasks ignore misses nested .claude dirs

- **verdict:** confirmed.
- **fix (C2):** `.claude/scheduled_tasks*` → `**/.claude/scheduled_tasks*` at
  `rhachet/best-practice/.gitignore.declapract.ts:36`; resnap
  `rhachet/__snapshots__/.gitignore.declapract.test.ts.snap:5` and
  `git/__snapshots__/.declapract.integration.test.ts.snap:19,46`.
- **class / care:** B3 · alt.

## #668 — a deploy from a dirty tree stamps a COMMIT that does not match the bytes

- **verdict:** partly. COMMIT is already stamped.
- **fix (C2):** the deploy commands gain a dirty-tree guard (`git status --porcelain` non-empty →
  exit 2) before build and creds.
- **class / care:** B7 · alt. lands after #667, so the guard does not trip on scheduled_tasks.

## #669 — no ci job runs the evaluation tests

- **verdict:** confirmed.
- **fix (C2):** `.test.yml` gains a `test-evaluation` job, shaped like test-shards-integration, that
  runs `npm run test:evaluation --if-present`; resnap.
- **class / care:** B7 · alt.
- **call:** the job is always present; `--if-present` makes it a no-op where no `test:evaluation`
  entry exists.

## #670 — the sdk-aws-lambda 0.7.0 patch outlives 0.7.1

- **verdict:** confirmed.
- **fix (C3):** extend #646's `node-service/bad-practices/sdk-aws-lambda-pre-0.7`:
  - delete the `pnpm.patchedDependencies` key `sdk-aws-lambda@0.7.0` (also in `pnpm-workspace.yaml`);
  - delete `patches/sdk-aws-lambda@*.patch`;
  - set 0.7.1.
- **class / care:** B2 · crit.
- **call:** match only below the floor, so a repo that patches 0.7.1 for its own reason keeps it.

## cross-cut — #646 and #650 are not built yet

- `node-service/best-practice/package.json:4` floors sdk-aws-lambda at 0.4.0;
- `tests-service/best-practice/package.json:3` still requires `simple-lambda-testing-methods` 0.5.1.
- so #670 and #666 ride on the #646/#650 work in 5.1.
