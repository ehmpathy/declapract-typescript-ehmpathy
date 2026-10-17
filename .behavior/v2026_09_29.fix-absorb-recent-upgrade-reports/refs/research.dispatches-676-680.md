# research — dispatches #676–#680 (seed S9)

each claim verified against this tree on 2026-10-11. paths are under `src/practices/`.

## #676 — expo local https proxy races its target; metro cache crosses environments

- **verdict:** parts 1 and 2 confirmed, both stamped from this tree. part 3 (a `serve.app` skill)
  is a feature owned by another repo.
- **evidence:**
  - `cicd-app-react-native-expo/best-practice/package.json:8` — `start:hot:proxy` runs
    `npx local-ssl-proxy --source 3447 --target 8081`, no wait on the target.
  - `…/package.json:15` — `start:cold:proxy` (`--target 3000`), no wait.
  - `…/package.json.declapract.ts:3` — CONTAINS.
  - `typescript-expo/best-practice/package.json:4` — `build:web` = `npx expo export --platform web`;
    no cache keyed on the app config. CONTAINS (`…/package.json.declapract.ts:12`).
  - no `metro.config.js` practice exists; `wait-on` is declared by no practice.
- **fix:**
  - part 1 (C2 on a CONTAINS file): prefix both proxy commands with `wait-on tcp:<port> &&`;
    declare `wait-on` as a devDependency. idempotent; usecase-blind, so a narrow scope is safe.
  - part 2 (C2 findsert): a `metro.config.js` declaration that inserts a `cacheStores` block keyed
    on `ACCESS` + the app config hash, only where absent. never EQUALS: adopters hand-edit this file
    (#604's blockList, hoist tweaks). declare `metro-cache`; depcheck ignore per #609.
  - part 3: a reseed to rhachet-roles-ehmpathy (seed S5).
- **class / care:** part 1 B5 alt · part 2 B1 crit (a prep transform can ship in a prod bundle,
  silent) · part 3 B7 alt.
- **depends on:** part 1 and 2 are independent of the held playwright work. part 2 shares a file
  home with held #604, so its shape must leave room for #604's blockList. part 2 competes with
  #618's `--clear` (a keyed cache makes `--clear` redundant: 358s → 7.7s on a warm export).

## #677 — build the expo web export once, cache it, shard test-play in the playwright container

- **verdict:** partly. the perf claims describe app-hometools-native's own workflow; this tree has
  no `test-play`, `test-build`, playwright config, or metro config to extend.
- **evidence:**
  - `cicd-common/best-practice/.github/workflows/.test.yml:20-368` — no `test-play` or `test-build` job.
  - `…/.test.yml.declapract.ts:8` — EQUALS, shared by every usecase.
  - `cicd-app-react-native-expo/best-practice/.github/workflows/test.yml:21` — expo reuses `.test.yml`.
  - no `playwright*` file under `src/practices`.
- **fix:** an expo-owned reusable workflow, never a usecase-aware edit of the shared EQUALS
  `.test.yml` (a narrow `--practice` scope would strip the expo jobs).
- **class / care:** B7 alt.
- **depends on:** 🔴 the held playwright work — it needs #603 (the practice), #604 (metro blockList,
  runner split), #617 (declared runner), and the `@playwright/test` floor that work sets. hold with
  them (seed S3).

## #678 — run the production build as a pr check (`test:build`)

- **verdict:** the main claim is refuted for this tree; the pr pipeline already builds.
- **evidence:**
  - `cicd-common/best-practice/.github/workflows/.test.yml:67-68` — `test-types` runs
    `npm run build` before `test:types`.
  - `…/.test.yml:232-233`, `:307-308` — every integration and acceptance shard builds too.
  - `typescript-node/best-practice/package.json:14` — `build` is the same chain the deploy runs
    (`serverless/best-practice/package.json:9`: `npm run build && sls deploy`).
  - no `NODE_OPTIONS` / `max-old-space` in any practice, so pr and deploy share one heap default.
  - the reporter's drift came from an adopter's hand-raised `test:types` heap, not a template.
- **fix:** no new job (it would duplicate `test-types:67` and collide with #677's `test-build`
  name). a clamp test asserts every pr workflow the practices emit runs `npm run build`, so the
  coverage the issue asks for cannot regress; the issue closes with that clamp and a comment that
  cites `.test.yml:67`.
- **class / care:** B7 alt.
- **depends on:** naught outside this repo.

## #679 — name test files `$prefix._.{acpt,intg,unit,eval}.test.ts`

- **verdict:** confirmed absent — every jest config matches only the old suffixes.
- **evidence:**
  - `tests-node/best-practice/jest.unit.config.ts:31-37`, `jest.integration.config.ts:32`,
    `jest.acceptance.config.ts:32`; `tests-expo/best-practice/jest.*.config.ts` likewise. all EQUALS.
  - `tests-any/best-practice/src/**/*.test.ts.declapract.ts`, `*.integration.test.ts.declapract.ts`,
    `tests-service/best-practice/blackbox/**/*.acceptance.test.ts.declapract.ts` — keyed on old names.
  - precedent for a rename: `tests-any/bad-practices/old-extension-pattern/`.
- **fix:**
  1. C1 jest configs match both suffix forms; unit excludes every kind suffix, old and new.
  2. C3 rename bad-practice per kind (via `relativeFilePath`), which moves the paired
     `__snapshots__/<file>.snap` too. idempotent — the new name leaves the glob.
  3. re-key the tests-any and tests-service declarations to the new names.
  4. the old suffixes stay matched while any adopter file still carries one, so no unmigrated test
     drops silently.
- **class / care:** B7 alt (done wrong, a B2).
- **depends on:** `rhx git.repo.test` (rhachet-roles-ehmpathy) keys on the jest configs — a reseed.
  overlaps #647 / #665 (same testMatch lines) and #669 (the `eval` kind).

## #680 — pnpm `allowUnusedPatches` + `ignorePatchFailures` by default

- **verdict:** confirmed absent.
- **evidence:**
  - `pnpm/best-practice/package.json:2` — only `packageManager`; CONTAINS (`…declapract.ts:19`).
  - no `allowUnusedPatches` / `ignorePatchFailures` / `patchedDependencies` anywhere in `src/`.
  - `pnpm/bad-practices/npm-overrides/package.json.declapract.ts:61-64` — the merge precedent that
    keeps other `pnpm.*` keys.
- **fix:** C2 — `"pnpm": { "allowUnusedPatches": true, "ignorePatchFailures": true }` in the CONTAINS template; the fix merges
  and keeps `overrides`, `onlyBuiltDependencies`, `patchedDependencies`. a test proves other keys
  survive; a twice-apply test proves convergence.
- **class / care:** B4 crit — an adopter with a stale patch hard-fails `ERR_PNPM_UNUSED_PATCH` on
  the next upgrade (measured in nheuron; svc-chat via #670).
- **call:** both keys land (seed S10 overruled F55's narrower take): a stale or failed patch warns,
  never halts an upgrade. no declapract check flags it — a check with no fix marks `package.json`
  manual and blocks `apply` in the same way. a stale patch (keyed off the lockfile's resolved
  version) is retired by a fix instead — #670's mechanism, made general (F56).
- **depends on:** pnpm 10.34.5 (the current pin) carries both settings. #670 still deletes the
  stale entry and its patch file.

## .cross-cut — the playwright hold (seed S3)

- #677 is part of the held playwright work → D2 with #603 / #604 / #617.
- #676 parts 1 and 2 are not playwright work → D1. part 2's `metro.config.js` is shaped as a
  findsert so held #604 appends its blockList later.
- #678, #679, #680 are independent of the hold.
