# research — expo cluster (#621, #620, #619, #618, #610, #609, #608, #604, #603)

headline: no `metro.config.js` exists under src; #609's require came from a consumer hand-copy of the #603/#604 pattern, so #609's fix ships with #604. #617 (config-prefix runner detection, `$runner.$tier.config.*`) decides the runner question for #603/#604 — acceptance is one concept, two runners; they land together.

## #621 — tests-expo ships no livedb wake
- now: tests-expo jest configs wire `globalSetup: 'test-fns/autoprune.setup.jest'` direct (acceptance `:40`, unit `:50`, integration `:39`). `useWakeOfLivedb.ts:46,80` gates on `config/<env>.json` `database.tunnel` (expo never has one); prod refusal `:41`, ci skip `:37`.
- fix: move `src/.test/useWakeOfLivedb.ts` tests-node → tests-any (same path, one declarer; tests-any = tests-node ∪ tests-expo). pure `getWakeDecision({ access, ci, reaches })`, `reaches: 'via-config-tunnel' | 'via-gateway'`; undeclared access folds to prep; prod refuses. tests-expo gains `jest.integration.prepare.ts` + `play.acceptance.prepare.ts` (wake + autoprune). EQUALS.
- decision: expo prepare declares `reaches: 'via-gateway'` (55%); alt = opt-in `start:livedb:prep`.
- tests: extend `livedb-wake-branches…integration.test.ts` (prod refuses; undeclared → prep; via-gateway wakes); update `tests-any/autoprune-hooks…test.ts:59-61`.

## #620 — start:cold:prep == start:cold:prod
- now: `cicd-app-react-native-expo/best-practice/package.json:16,19` identical. (issue's "no build:web" is wrong: `typescript-expo/best-practice/package.json:4` declares it.) scouts: `:18` `start:cold:prep:proxy` is `"echo npm run start:cold:prep:link && …"` — echo prints instead of runs.
- fix: `"start:cold:prep": "ACCESS=prep npm run build:web && npx serve dist --single"`, same for prod; drop the stray echo. CONTAINS JSON → default fix replaces values.
- decision: as issued (90%); an old-dev-commands bad-practice to strip `start:*:dev*` (50%).
- tests: repo-wide clamp — sibling npm commands that differ only by an access token must differ in body and mention it (model `serverless/divergentStageGuard…test.ts`).

## #619 — web compile never receives access
- now: `.deploy-expo.yml:133-134` compile step has no `env:`; `deploy-web` runs only when `inputs.access == 'prod'` (`:104`), so live defect = local/acceptance builds silently get prod.
- fix: `env: ACCESS: ${{ inputs.access }}` on the compile step (EQUALS); `build:web` (typescript-expo sole declarer) → `ACCESS=${ACCESS:-prep} npx expo export --platform web --clear`. the issue's step 3 (refuse NODE_ENV=production w/o access) has no in-tree target — satisfied by construction; readme note.
- decision: author no consumer env code (65%).
- tests: compile-step `env.ACCESS`; update `tests-expo/.declapract.integration.test.ts:91` + snapshots; clamp every `expo export|start` command declares `ACCESS`.

## #618 — expo export without --clear
- now: `typescript-expo/best-practice/package.json:4` lacks `--clear` (`start:hot:*` has it).
- fix: same `build:web` line as #619. decision: always `--clear` (75%); cost: cold export in ci.
- tests: clamp every `expo export|start` carries `--clear`.

## #610 — print the version contention set at hoisted flip
- now: `utils/defineExpectedNpmrcContents.ts:34,62` adds `node-linker=hoisted`; `node/best-practice/.npmrc.declapract.ts:60` fix is silent; its brief lives under `.agent/`, unpublished (package `files` = `/dist`, `/declapract.declare.yml`).
- fix: in the `.npmrc` fix, only on transition (input lacks hoisted, output has it), read `pnpm-lock.yaml` `packages:` (else `package-lock.json`) via `context.getProjectRootDirectory()`; pure `getContentionSetFromLockfile({ text })` → names with >1 version; print to stderr w/ the `pnpm.overrides` remedy + a github URL to the brief. memoize per root (declapract calls fix in plan and apply: `evaluateProjectAgainstFileCheckDeclaration.js:86,117`, `fixFile.js:26`). file contents unchanged.
- decision: stderr, not a `.npmrc` comment (70%).
- tests: unit the transformer (two names at two versions); integration seeds `src/.test/assets/expo-migration/repo-app-protools-shaped/pnpm-lock.yaml`, spies stderr, snapshots; second apply prints naught.

## #609 — depcheck blocker vs metro-config require
- now: no require today. `lint/best-practice/.depcheckrc.yml` CONTAINS w/ append-only union fix (`.depcheckrc.yml.declapract.ts:8-41`); `metro-config` not on the denylist (`depcheck-denylisted-ignores/…declapract.ts:4-13`).
- fix: lint `.depcheckrc.yml` contents fn appends `metro-config` when `projectPractices` includes `tests-expo` (union → scope-safe); #604's metro.config.js avoids the require. decision: both (80%).
- tests: extend `lint/.depcheckrc.yml.declapract.test.ts` expo vs node usecase; twice-fix no-op.

## #608 — expo usecase: provision-github migration, no provision.yml caller
- now: `useCases.yml:85-97` expo usecase has no cicd-package/cicd-service; callers exist only in `cicd-package/best-practice/.github/workflows/provision.yml` (`wish-path` `:25`) and cicd-service.
- fix: `cicd-app-react-native-expo` declares `.github/workflows/provision.yml` with a custom check+fix (not EQUALS): replace/insert `jobs.github`, drop any job whose steps reference `provision/github/`, keep all other jobs.
- decision: as above (65%).
- tests: clamp — every usecase w/ provision-github resolves a `provision.yml` whose github job `wish-path` is `provision/github.repo/resources.ts`; executeApply before (terraform github job + extra aws job) / after, twice.

## #603 + #604 — playwright acceptance for expo, metro blockList, runner split
- now: no playwright config, no metro.config.js, no `.play.test` exclusion; `tests-expo/best-practice/jest.unit.config.ts:40` matches `**/*.test.{ts,tsx}`; `jest.acceptance.config.ts:15` mentions a playwright swap; `test:acceptance` only in tests-any (`package.json:13,15`) as jest.
- fix (fold into tests-expo; useCases unchanged, tests-expo already in `app-react-native-expo` `:96`):
  - `tests-expo/best-practice/play.acceptance.config.ts` (EQUALS): testDir `./src`, testMatch `**/*.play.test.ts`, webServer `npm run build:web && npx serve dist -l 19006 --single`, `chromium-desktop` + `chromium-mobile` (Pixel 5), `toHaveScreenshot` maxDiffPixelRatio 0.05 + animations off, `globalSetup: './play.acceptance.prepare.ts'`; base URL local vs deployed prep from `ACCESS`/`LOCALLY`.
  - `tests-expo/best-practice/metro.config.js` + custom `.declapract.ts`: absent → template; present → insert before `module.exports` `config.resolver.blockList = [...[config.resolver.blockList].flat().filter(Boolean), /.*\.play\.test\.tsx?$/];` (no metro-config require — dodges the sdk-54 private/src path fork; verify array blockList on sdk 54, 70%); no anchor → leave file, check fails loud.
  - `jest.unit.config.ts` adds `'!**/*.play.test.{ts,tsx}'`.
  - example `src/app/(public)/index.play.test.ts` findsert.
  - `tests-expo/package.json.declapract.ts` fix adds pinned `@playwright/test`.
  - `cicd-app-react-native-expo/.gitignore.declapract.ts:16` + `playwright-report/`, `test-results/`.
  - tests-any `test:acceptance` / `:locally` detect runner by config prefix at run time (one string for every usecase — avoids a usecase-aware key a narrow `--practice tests-any` apply would revert).
  - bad-practice relocates `playwright.config.ts` → `play.acceptance.config.ts`.
  - baselines committed; readme note. browser install + jest-only flags ride #617.
- decisions: one concept two runners, `play.acceptance.config.ts` (65%); home tests-expo (60%); blockList w/o require (70%); runtime detection in `test:acceptance` (55%, alt: a separate `test:play` key).
- tests: executeApply on `src/practices/tests-expo/.test/assets/repo-expo-greenfield` + a metro.config.js w/ `module.exports` anchor; assert blockList, play config, unit exclusion; snapshots; second apply byte-identical; clamp that `test:acceptance` picks playwright only with the play config; update drift guards in `cicd-app-react-native-expo/.declapract.integration.test.ts`.
- risk: medium — consumer metro.config shapes vary (anchor miss is loud); double build on expo; authed routes need deployed-prep mode.
