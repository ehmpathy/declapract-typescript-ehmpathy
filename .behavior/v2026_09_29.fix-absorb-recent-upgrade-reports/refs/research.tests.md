# research — tests / keyrack cluster (#611, #612, #623, #651, #622, #617)

cross-repo: `rhachet-roles-ehmpathy#764` (open) for #617; an `ACCESS` export in `git.repo.test` for #651 (not on main, no issue filed). neither blocks the template fix here.

## #611 + #612 — sdk falls through to the ec2 instance role (one defect, one fix)
- now: no `AWS_EC2_METADATA_DISABLED` anywhere in src. `tests-node/best-practice/src/.test/useKeyrack.ts`: `requiresAwsAuth` gate :193-197; static-creds early return :201-205; raw `cause: error` :75 (the #632 class). integration env uses default `lenient` (`jest.integration.env.ts:51`), acceptance `strict` (`jest.acceptance.env.ts:36`).
- fix (in useKeyrack, EQUALS delivery): after the `requiresAwsAuth` return and before the static-creds return, set `process.env.AWS_EC2_METADATA_DISABLED = 'true'`; compute `requiresAwsAuth` before `keyrack.source` and use `mode: 'strict'` when true; keep the static-creds return; `:75` → `cause: error instanceof Error ? error : new Error(String(error))` (with #632). ci untouched (`CI` short-circuits at :180).
- decision: bar in useKeyrack gated on requiresAwsAuth (75%); strict only when aws auth required (60%); keep static-creds return (70%).
- tests: inject `{ env, cwd, keyrack }`; case1 temp dir w/ `.agent/keyrack.yml` + `awsAccountId` → bar set (red without the line); case2 no awsAccountId → unset; case3 static-creds branch still bars; twice-call idempotent.
- risk: low; a box that relied on its instance role now fails loud (intended).

## #623 — keyrack once per run
- now: `jest.{integration,acceptance}.env.ts` call useKeyrack per suite file; `jest.*.prepare.ts` globalSetup exists (wired `jest.*.config.ts:40`) and runs `useWakeOfLivedb` then `autopruneSetup`.
- fix: move `useKeyrack(...)` + relative import into both `jest.*.prepare.ts`; delete from env files. env reaches workers (in-band shares process; forked workers inherit env). order: wake → keyrack → autoprune (keyrack first would leak test static creds into `rhx use.rds.capacity --env prep`). all EQUALS.
- decision: move (85%); wake before keyrack (70%).
- tests: extend `livedb-wake-prepare.declapract.integration.test.ts` — prepare contains `useKeyrack(` w/ relative import, index between `await useWakeOfLivedb(` and `await autopruneSetup(`; env files lack `useKeyrack(`.

## #651 — cloud acceptance vs prep hangs
- now: `jest.acceptance.env.ts:36` `process.env.ACCESS ?? 'test'`; useKeyrack defaults the same (:174-175). `git.repo.test --env prep` sources prep keyrack in its shell (~:1055-1058) but never exports `ACCESS`, so jest re-sources TEST keyrack over the prep profile. hang root cause likely creds/fleet mismatch + the v2 caller (#650) — unconfirmed.
- fix here: pure leaf `getOneKeyrackEnvForAcceptance({ env })` — `ACCESS` set → it; `LOCALLY=true` → `'test'`; else throw ConstraintError "set ACCESS=prep|prod for a cloud acceptance run". call it from `jest.acceptance.prepare.ts` (EQUALS). the #611/#612 bar turns any leftover mismatch loud.
- upstream: `git.repo.test` should `export ACCESS="$ENV_NAME"` for acceptance --against cloud; file an issue on rhachet-roles-ehmpathy.
- decision: throw on local cloud run w/o ACCESS (70%).
- tests: unit the leaf over ACCESS=prep / LOCALLY / neither (red today) / CI.

## #622 — build only when stale before local acceptance
- now: `tests-any/best-practice/package.json:13` `test:acceptance:locally` runs `npm run build` (CONTAINS; default merge). `typescript-node/best-practice/package.json:14` `build` starts with `build:clean` (`rm -rf dist`). `build:complete` is repo-owned.
- fix: `tests-any` adds `build:ifstale`; `test:acceptance:locally` calls it; ci `test:acceptance` keeps full build. shape: `[ -f dist/.build.stamp ] && [ -z "$(find src bin package.json pnpm-lock.yaml tsconfig.json tsconfig.build.json -newer dist/.build.stamp ! -name '*.test.ts' -print -quit 2>/dev/null)" ] && echo '👌 dist is fresh, build skipped' || (npm run build && touch dist/.build.stamp)`. stamp written by ifstale, not `build:complete`. add `build:ifstale` to the order list in `package-json-order/best-practice/package.json.declapract.ts:~40`.
- decision: own in `tests-any` so expo inherits (65%).
- tests: temp-dir integration w/ a stub counter build — run1 builds + stamps, run2 skips, touch src → rebuild, failed build → no stamp.

## #617 — declared acceptance runner in .test.yml
- now: `cicd-common/best-practice/.github/workflows/.test.yml` EQUALS; acceptance steps (:321,:329,:331) hardcode jest flags; slow-test report gated only by `hashFiles` (:334-336); no browser install; expo test.yml calls the same file; no playwright practice.
- fix: `best-practice/.github/workflows/detect-test-runner.sh <tier>` (playwright if `play.<tier>.config.*`, else jest; both → exit 2); `runner` output in `test-shards-acceptance`; playwright-only `npx playwright install --with-deps chromium`; jest steps gated `runner == 'jest'`; playwright step `npm run test:acceptance -- --shard=i/n`; explicit shards + playwright → fail loud; report gated jest. second half: `tests-any` package.json + tests-node/tests-expo `jest.acceptance.*` checks pass when `play.acceptance.config.*` exists (via `getProjectRootDirectory`).
- decision: detect by config prefix (80%); carve-out needed (65%).
- tests: spawn the detect command over fixtures (playwright/jest/neither/both→2); assert `.test.yml` gates; update cicd-common snapshots.
