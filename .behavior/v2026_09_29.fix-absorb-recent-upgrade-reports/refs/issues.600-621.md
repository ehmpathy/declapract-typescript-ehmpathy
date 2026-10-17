=================== #621 🎙️ task - fix(tests-expo): the expo practice ships no livedb wake, and the node one's gate cannot fire in an expo repo

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(tests-expo): the expo practice ships no livedb wake, and the node one's gate cannot fire in an expo repo
**description**
# fix(tests-expo): the expo practice ships no livedb wake, and the node one's gate cannot fire in an expo repo

## .the gap, precisely

read off the installed `declapract-typescript-ehmpathy` on 2026-09-20:

| # | link | where |
|---|---|---|
| 1 | `tests-node` ships a livedb wake, composed into a globalSetup, with branch clamps and a `#598` history | `.../tests-node/best-practice/src/.test/useWakeOfLivedb.ts` · `jest.{integration,acceptance}.prepare.ts` |
| 2 | `tests-expo` ships **no wake at all** — its three configs wire `globalSetup: 'test-fns/autoprune.setup.jest'` directly | `.../tests-expo/best-practice/jest.{unit,integration,acceptance}.config.ts:50,39,40` |

⇒ 🔴 **the practice already solved this, once, for one consumer shape.** an expo app hits the identical cluster and gets none of it.

## .why an expo app reaches the same cluster

an expo app owns no database. it reaches one **through the gateway**, which proxies to peers that query the shared aurora-serverless cluster — so the pause is upstream of upstream, and the flake arrives in a repo with no local cause to find.

that is the exact case `useWakeOfLivedb`'s own `.why` already names:

> *"a gateway/fan-out service owns NO db of its own, so a db-ownership signal misses it"*

⇒ the reasoning generalizes one hop further than the practice applied it. an **expo app** is a fan-out consumer of a fan-out service.

## 🔴 .and a straight copy would silently no-op

`useWakeOfLivedb` self-gates on a declared tunnel:

```ts
// useWakeOfLivedb.ts:46, :80
if (!asReachesSharedClusterFromConfig({ env })) return;
const configPath = join(process.cwd(), 'config', `${input.env}.json`);
```

🔴 **an expo app has no `config/` directory.** it declares its environment in `app.config.ts` → `extra.env`, read at runtime through `expo-constants`. so `readConfigText` returns `null`, the gate folds to `false`, and the wake returns before it acts.

⇒ that is the worst shape a repair can take: the file is present, the import is wired, the clamp for "does it call `rhx use.rds.capacity`" passes — **and no wake ever fires.** a maintainer who copies the file across and verifies would find no defect in it.

🟡 so this is not "copy `useWakeOfLivedb` into `tests-expo`". the gate needs a signal an expo repo actually has.

## .the second shape difference — the expo acceptance tier is PLAYWRIGHT

`tests-expo` declares `jest.acceptance.config.ts` today. downstream, the acceptance tier that drives a real browser is `play.acceptance.config.ts`, per the config-prefix work in `ehmpathy/rhachet-roles-ehmpathy#764`.

playwright takes a `globalSetup` too, and it is **easier** than jest's: playwright imposes no single-globalSetup constraint, so there is no composition problem to solve — the wake does not have to be braided with `test-fns/autoprune.setup.jest`.

⇒ and `globalSetup` runs **before `webServer`**, so on an expo repo the wake overlaps the ~2.5min cold `expo export` rather than adds a minute of its own. that timing is free and it is worth a note in the practice.

## .the repair — three parts

**1. give `tests-expo` a wake**, and gate it on a signal an expo repo has. candidates, in order of how first-party each is:

- the tier itself — an acceptance/integration run is, by construction, a run that reaches a deployment
- an `ACCESS` env var, which the practice already declares on `build:web` and `start:*` (see `#619`, `#620`)
- an explicit opt-in key, if neither of the above is judged safe enough to fire unprompted

**2. keep the prod refusal.** `useWakeOfLivedb:41` already has it, and it must survive the port:

```ts
if (env === 'prod') return; // prod never scales to 0
```

🔴 **it carries weight in a way the node practice never had to face.** an expo acceptance tier can legitimately declare `ACCESS=prod` — ours does today, because the one checked-in test identity is minted for the prod whodis directory. so the prod arm is the arm that is **taken on every run** in that repo, and without it a test run performs an unprompted capacity write against production infrastructure. `rule.require.safe-by-default`.

**3. wire it at `globalSetup` in `play.acceptance.config.ts`**, not at a test file.

## 🟡 .the ubiqlang half, and it is the cheapest of the three

three names for one concept, across the org, read off disk 2026-09-20:

| name | where | shape |
|---|---|---|
| `useWakeOfLivedb` | the practice, `tests-node` | self-gated, prod-refusing, loud on failure |
| `useDbWake` | `ahbode/svc-gateway`, `src/utils/useDbWake.ts` | **no** self-gate, **no** prod refusal, silent swallow |
| `useDbWake` | `ahbode/app-protools-native` (adopted from svc-gateway, 2026-09-20) | prod refusal re-derived from scratch |

⇒ 🔴 **the middle row is the finding.** svc-gateway's hand-rolled copy is the one every downstream consumer reads and copies, and it lacks the prod refusal the practice already has — so the defect propagates from the copy rather than from the canon.

🟡 and our own repair re-derived that refusal **independently**, with no knowledge the practice already carried it. that is the tell that the practice owns the concept and is not reaching the consumers who need it. `rule.forbid.domain-term-synonyms`: one concept, one word, and `useWakeOfLivedb` is the one with the argument behind it.

## .the clamp this owes

the node practice already clamps the branches (`livedb-wake-branches.declapract.integration.test.ts`). the expo port owes the same, plus one the node half does not need:

```ts
then('it refuses to wake prod, rather than write capacity against production', () => {
  expect(getWakeDecision({ access: 'prod', ci: undefined }).wake).toEqual(false);
});
then('an undeclared access falls to prep, never to prod', () => {
  expect(getWakeDecision({ access: undefined, ci: undefined }).access).toEqual('prep');
});
```

dogfooded downstream per `rule.require.clamp-edge-cases`: with the prod arm reverted to `{ wake: true }`, both go red; restored, green.

⇒ and the gate itself owes a clamp, because **its failure is silent by construction** — a wake that does not fire looks exactly like a wake that did, until a cold start eats a tier.

## .the cost, stated

the wake blocks suite start on a local run. on the expo acceptance tier that cost is **zero in practice**, since `globalSetup` precedes the ~2.5min `expo export` and the two overlap. on the integration tier it is a real wait, bounded by the node practice's own `LIVEDB_WAKE_TIMEOUT_MS`.

## .see also

- `.../tests-node/best-practice/src/.test/useWakeOfLivedb.ts` — the operation this asks to reach expo
- `.../tests-expo/best-practice/jest.acceptance.config.ts:40` — the config with no wake
- `#598` — the composite-globalSetup work this builds on
- `#619` / `#620` — the `ACCESS` axis, one candidate signal for the gate
- `ehmpathy/rhachet-roles-ehmpathy#764` — the `play.acceptance.config.ts` prefix this wires into
- the downstream record: `ahbode/app-protools-native` `blackbox/.test/infra/database.ts`

=================== #620 🎙️ task - fix(expo): start:cold:prep and start:cold:prod are byte-identical, and both reach prod

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(expo): start:cold:prep and start:cold:prod are byte-identical, and both reach prod
**description**
# fix(cicd-app-react-native-expo): `start:cold:prep` and `start:cold:prod` are byte-identical, and both reach prod

## .the gap, precisely

read off the installed practice's `best-practice/package.json` on 2026-09-20:

```json
"start:hot:prep":  "ACCESS=prep npx expo start --clear --dev-client",   // line 9
"start:hot:prod":  "ACCESS=prod npx expo start --clear --dev-client",   // line 12
"start:cold:prep": "npm run build:web && npx serve dist --single",      // line 16
"start:cold:prod": "npm run build:web && npx serve dist --single",      // line 19
```

🔴 **lines 16 and 19 are the same string.** the two names differ; the two commands do not.

⇒ and the practice ships **no `build:web` declaration at all** — only these two callers of it. so whichever access a downstream repo's `build:web` happens to derive, BOTH cold commands get it.

## .why it is worse than a duplicate

the `hot` pair proves the practice knows the axis — it declares `ACCESS=prep` / `ACCESS=prod` explicitly, one line above. so a reader sees a pair that declares, then a pair that does not, and reasonably concludes the cold pair inherits it somehow.

it does not. with `extra.env.ACCESS` absent, `expo export` inlines `NODE_ENV=production`, so:

| the command a builder runs | the access they intend | the access they get |
|---|---|---|
| `start:cold:prod` | prod | prod — **by coincidence** |
| `start:cold:prep` | prep | 🔴 **prod** |

⇒ **the safe-named one is the dangerous one**, which is the precise inversion of `rule.require.safe-by-default`. a builder who reaches for `prep` to avoid prod gets prod, silently, and the only tell is network traffic they have no reason to inspect.

## .the repair

```json
"start:cold:prep": "ACCESS=prep npm run build:web && npx serve dist --single",
"start:cold:prod": "ACCESS=prod npm run build:web && npx serve dist --single",
```

plus the `build:web` declaration the practice owes, with the absent case defaulted safe:

```json
"build:web": "ACCESS=${ACCESS:-prep} npx expo export --platform web"
```

## 🟡 .the general cue this is one instance of

> **two npm entries whose NAMES differ on an axis, and whose BODIES are identical, do not honor that axis.**

it is mechanically checkable and it reads as a tidiness nitpick, which is why it survives review. the pair above is the expensive case: the axis it claims to vary on is *which deployment a builder talks to*.

⇒ worth a declapract check of its own — any `$name:$axis-value` family whose bodies never mention the axis is a family that does not honor it.

## .the residual this exposes downstream

`ahbode/app-protools-native` carried the same pair, plus a `:dev` twin of each (`start:cold:dev`, `start:cold:dev:link`, `start:cold:dev:proxy`, `start:hot:dev`, …) left over from the retired `stage`/`dev` axis. nine entries collapsed to the `prep`/`prod` pair once the axis was declared.

⇒ so a downstream repo may hold a `:dev` family the `old-stage-enum` bad-practice does not touch — that migration covers the TS enum, and no bad-practice covers **npm entry names**, **env var names**, **workflow input names**, or **`eas.json` profiles**. worth its own check.

## .see also

- the two peer dispatches: the compile step that never receives `inputs.access`, and the stale inlined app manifest
- `#572` — `old-stage-enum must not guess the axis of Stage.DEVELOPMENT`
- `#577` — `finish the prep-over-dev migration` (the lambda-service half of the same axis retirement)

=================== #619 🎙️ task - fix(expo): the web compile never receives the access input, so every deployed bundle guesses

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(expo): the web compile never receives the access input, so every deployed bundle guesses
**description**
# fix(cicd-app-react-native-expo): the web compile never receives the `access` input, so every deployed bundle guesses

## .the gap, precisely

read off the installed `declapract-typescript-ehmpathy` on 2026-09-20:

| # | link | where |
|---|---|---|
| 1 | `deploy.yml` DECLARES an `access` input, and passes `access: prep` / `access: prod` to the callee | `.../best-practice/.github/workflows/deploy.yml:12,54,69` |
| 2 | `.deploy-expo.yml` then compiles the web bundle with **no `env:` block at all** | `.../best-practice/.github/workflows/.deploy-expo.yml:133-134` |

```yaml
      - name: compile
        run: npm run build:web        # <- inputs.access is in scope here, and unused
```

⇒ 🔴 **the practice already holds the access and throws it away one step before it matters.**

## .why that is a prod-reach defect, not a cosmetic one

- `expo export` inlines `NODE_ENV=production` into **every** export — a prep one and a prod one alike
- so with `extra.env.ACCESS` absent, an app that infers its access from `NODE_ENV` resolves to `prod`
- ⇒ **a prep web deploy silently talks to the prod gateway**, and the prod deploy hits prod by *coincidence* rather than by declaration

measured in `ahbode/app-protools-native`: `build:web` set no access, so `extra.env` was empty in the bundle, the app fell through to `NODE_ENV=production`, and the api host resolved to `https://api.ahbode.com` plus the **prod** whodis directory — for the acceptance walk, `start:cold:prep`, and every local static serve. no one chose prod; it fell out of an absent env var, which is the inverse of `rule.require.safe-by-default`.

## .the repair — three lines, in two files

**1. thread the input into the compile step** (`.deploy-expo.yml`):

```yaml
      - name: compile
        run: npm run build:web
        env:
          ACCESS: ${{ inputs.access }}
```

**2. make the ABSENT case the safe one** (`package.json`):

```json
"build:web": "ACCESS=${ACCESS:-prep} npx expo export --platform web"
```

**3. make the guess REFUSE rather than default** — wherever the practice's environment module infers an access from `NODE_ENV`:

```ts
if (nodeEnv === 'production')
  throw new Error(
    'env.ACCESS must be declared when NODE_ENV=production, since NODE_ENV names the build and never the access. declare it on the build — e.g. `ACCESS=prep npm run build:web`, or `env: ACCESS` on a deploy compile step.',
  );
```

⇒ 🟡 **step 3 carries the weight, and it is the one a reader will want to skip.** steps 1+2 fix today's callers; step 3 is what makes the NEXT absent caller fail loud at boot instead of reach for prod. the error names the fix, so a builder who forgets is unblocked in one line.

`development` → `prep` and `test` → `test` stay inferrable: each of those words names an access as well as a build. **`production` names a build and no access at all**, which is why it is the one value that must refuse.

## .the clamp this owes

an assertion, because none of this is visible in a green suite, a green typecheck, or a successful build:

```ts
then('it refuses to guess, rather than reach for prod', () => {
  expect(() => loadUnderNodeEnv('production')).toThrow(/env\.ACCESS must be declared/);
});
then('the refusal names the fix a builder must apply', () => {
  expect(() => loadUnderNodeEnv('production')).toThrow(/ACCESS=prep npm run build:web/);
});
```

dogfooded downstream per `rule.require.clamp-edge-cases`: with the refusal reverted to `return 'prod'`, the clamp goes red; restored, green.

## .see also

- `#572` — `old-stage-enum must not guess the axis of Stage.DEVELOPMENT`. the same family: a word that carries two axes, and a migration that must refuse rather than pick
- the two peer dispatches filed with this one: the byte-identical `start:cold:*` pair, and the stale inlined manifest that makes this repair *look* like it did not work
- the downstream record: `ahbode/app-protools-native` `.dream/v2026_09_20.fix.the-acceptance-tier-runs-against-prod-and-says-live.md`

=================== #618 🎙️ task - fix(expo): expo export without --clear inlines a stale app manifest, so ACCESS keeps its prior value

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(expo): expo export without --clear inlines a stale app manifest, so ACCESS keeps its prior value
**description**
# fix(cicd-app-react-native-expo): `expo export` without `--clear` inlines a STALE app manifest, so `ACCESS` keeps its prior value

## 🔴 .why this one is filed first among the three

the two peer dispatches make the practice DECLARE its access. **this defect makes that declaration appear not to work**, so a maintainer who lands them and then verifies will see the old access, conclude the repair is wrong, and revert it.

⇒ measured downstream 2026-09-20, in exactly that order.

## .the gap, precisely

`expo-constants`' web implementation reads the app config from a build-time inlined string:

```js
// node_modules/expo-constants/build/ExponentConstants.web.js:75-79
get manifest() {
    // This is defined by @expo/webpack-config or babel-preset-expo.
    return process.env.APP_MANIFEST || {};
},
```

so `app.config.ts`'s `extra.env.ACCESS` reaches the browser **only** as part of that inlined `APP_MANIFEST` string, which `babel-preset-expo` replaces at transform time.

🔴 **and the metro transform cache key does not include `APP_MANIFEST`.** so:

| run | command | what lands in `dist` |
|---|---|---|
| 1 | `npm run build:web` (no ACCESS) | manifest with **no** `extra.env.ACCESS` |
| 2 | `ACCESS=prod npm run build:web` | 🔴 **the run-1 manifest, reused from cache** |

## .the measurement

downstream, after run 2:

- the emitted bundle filename was **byte-identical** to run 1 — `index-472b5a63d6f25da7c666305dbc9d06c4.js`
- a grep of that bundle for `ACCESS":"prod` returned no match
- the app threw its absent-access guard **in the real browser**, and all 16 acceptance walks failed on it

then, with `--clear` added and one word otherwise unchanged:

- a new bundle hash — `index-2a81b339757adb1fb8ea7f74cae82b0a.js`
- `ACCESS":"prod` present
- 16/16 acceptance walks green

⇒ **one flag was the whole difference**, and without it the access a builder declares and the access an app reaches are two different values with no error between them.

## .the repair

```json
"build:web": "ACCESS=${ACCESS:-prep} npx expo export --platform web --clear"
```

🟡 **the practice already knows this.** its own `start:hot:prep` / `start:hot:prod` both carry `--clear` on `expo start` — precisely so a changed `ACCESS` takes effect. the export path is the one that omits it.

⇒ so this is a consistency repair, not a new idea: **every command that varies the app config must clear the bundler cache, or the config it declares is not the config it ships.**

## 🟡 .the wider claim, and why it is not `--clear`-specific

any value inlined through `APP_MANIFEST` has this property — `BUILD`, `NODE_ENV`, and every future `extra.env.*` key. so a reader should not take this as *"recall `--clear` for ACCESS"*:

> **an `expo export` whose app config can vary between runs is an export that must clear the cache, always.**

⇒ the alternative repair — teach the transform cache key to include `APP_MANIFEST` — belongs upstream in `babel-preset-expo` and is out of this practice's reach. `--clear` is the cost the practice can pay today, and a slower export is the correct price for a bundle that means what it says.

## .the cost, stated

`--clear` discards the transform cache, so every export is a cold one. downstream that is ~2 minutes against ~40 seconds. **worth it**: what the warm path saves is paid for with a bundle that may talk to the wrong deployment, and no signal that it does.

⇒ 🟡 if that cost is judged too high for the practice, the honest alternative is to clear ONLY when the access differs from the prior run — which needs a stamp of the last-built access in `dist/`, and is a real design call rather than a one-word fix.

## .see also

- the two peer dispatches, which this unblocks: the compile step that never receives `inputs.access`, and the byte-identical `start:cold:*` pair
- `node_modules/expo-constants/build/ExponentConstants.web.js:75-79` — the `process.env.APP_MANIFEST` read that makes the manifest a build-time artifact
- the downstream record: `ahbode/app-protools-native` `.dream/v2026_09_20.fix.the-acceptance-tier-runs-against-prod-and-says-live.md`

=================== #617 🎙️ task - feat(test.yml): let a repo declare its acceptance runner, rather than assume jest

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
feat(test.yml): let a repo declare its acceptance runner, rather than assume jest
**description**
## ⭐ the ask

let a repo **declare** its acceptance runner, rather than have `.test.yml` assume jest. today a
repo whose acceptance tier is playwright must carry a hand-written shim to survive cicd, and that
shim exists for no reason a consumer chose.

## the assumption, and where it lands

`.test.yml` shards the acceptance tier with jest-only flags:

```yaml
THOROUGH=true npm run test:acceptance -- --shard=1/1 --json --outputFile=jest-results.json
```

three flags, and only `--shard` is shared vocabulary:

| flag | playwright |
|---|---|
| `--shard=i/n` | identical form. fine |
| `--json` | `error: unknown option '--json'` |
| `--outputFile=<path>` | `error: unknown option '--outputFile'` |

⇒ so the acceptance job exits non-zero before it runs one test, and the repo has two options:
drop acceptance coverage in cicd, or write a shim.

## what a consumer is forced to write

`ahbode/app-protools-native` carries `playwright.runner.js`, ~100 lines, whose whole job is to
translate one dialect into another. its own header states the case plainly:

> this is a consumer-side shim for a practice-side gap. the durable fix belongs in
> declapract-typescript-ehmpathy, which should let a repo declare its acceptance runner rather
> than assume jest.

it does three things, and each is a symptom:

1. **drops the jest reporter flags.** it cannot map them onto playwright's json reporter either —
   the downstream "report slow tests" step reads `jest-results.json` with a jest-shaped `jq`
   filter, so a playwright json file under that name would read as a report and be none. with no
   file emitted, that step's `hashFiles` guard skips it honestly.
2. **fetches chromium.** `.test.yml` has no browser step, since jest needs none.
3. **names the config.** `--config ./play.acceptance.config.ts`.

⇒ every line of it is a cost the practice imposed and the consumer absorbed.

## the shape that would close it

the repo already declares its runner by a config prefix — `$runner.$tier.config.*`:

```
jest.unit.config.js        ⇒ jest drives the unit tier
play.acceptance.config.ts  ⇒ playwright drives the acceptance tier
```

one glob answers both which tiers exist and who owns each, with no new flag and no new manifest
field. `ehmpathy/rhachet-roles-ehmpathy#764` proposes exactly this detection for `git.repo.test`,
with a proven patch.

⇒ if `.test.yml` read the same signal, it could:

- emit `--shard` alone when the tier's runner is not jest
- skip the `jest-results.json` report step for that tier, rather than rely on `hashFiles`
- add a browser fetch step when the runner is playwright

and the consumer-side shim deletes.

## 🟡 the sharper cost — a false green

the flags are only half of it. before `#764`, `rhx git.repo.test --what acceptance` refused this
repo outright at exit 2, because it validated a `jest.acceptance.config.*` that a playwright repo
never has. so the tier was unreachable through the sanctioned door, which is what grew a local
wrapper skill beside it.

⇒ both defects share one root: **a capability the toolchain already models, asserted in one place
and hardcoded in another.** and both fail toward a green that carries no signal, rather than
toward a refusal a human would notice.

## .note on order

`#764` (runner detection in `git.repo.test`) and this (runner declaration in `.test.yml`) are
independent and compose. `#764` makes the tier reachable locally; this makes it reachable in cicd
without a shim.

=================== #616 🎙️ task - fix(lint:cycles): the // "^$" exclude fallback is dead syntax — join raises before it is read

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(lint:cycles): the // "^$" exclude fallback is dead syntax — join raises before it is read
**description**
## .what

the stamped `test:lint:cycles` gate carries a `// "^$"` fallback that is **dead syntax** — it
has never fired, in any yq, in any version.

```jsonc
// src/practices/lint/best-practice/package.json:13  (on origin/main today)
"test:lint:cycles": "dpdm … --exclude \"$(yq -r '.exclude | join(\"|\") // \"^$\"' .dpdmrc.yaml)\" …"
```

the `// "^$"` tail reads as *"if `.exclude` is absent, fall back to `^$`"*. it is not one.

## 🛑 .measured 2026-09-11 — `join` raises BEFORE `//` is ever read

fed a yaml doc with no `.exclude` key:

| engine | what it printed |
|---|---|
| go-yq 4.53.6 | `Error: cannot join with !!null, can only join arrays of scalars` |
| jq 1.7 | `jq: error (at <stdin>:0): Cannot iterate over null (null)` |

**both engines, same cause.** `//` is jq's *alternative* operator: it catches a `null` or `false`
**produced by** its left side. it does not catch an **error raised inside** it. `join` raises on
`null` rather than it returns one, so the right side is unreachable.

⇒ the alternative must precede the `join`, never follow it.

## .the cost, and why it is quiet

the gate wraps the filter in a `$(…)`, so the error collapses to an **empty string** and the
command becomes `dpdm --exclude "" …`. per #581 that is dpdm's **include-all** value — so the
gate then scans `node_modules` and reports hundreds of cycles that do not exist.

a false ✋ on every run is the shape that gets a check silenced rather than read.

⚠️ **it fires only where `.dpdmrc.yaml` OMITS `.exclude`.** the shipped best-practice file
declares `exclude: []`, and an empty ARRAY joins fine — so every repo that takes the stamp
whole takes the live arm and never sees it. a repo that hand-writes its own `.dpdmrc.yaml`,
or drops the key in an edit, gets the dead branch.

## 🔴 .#581 already named this fix, and it did not land

`1.vision.experience.case=_.md` row 21 states the remedy in these words:

> the real fix makes the empty state deliberate (**drop the `// "^$"` fallback** + comment the
> intent) so a future tidy-up cannot silently render dpdm's own `node_modules` default

the **comment** landed — `best-practice/.dpdmrc.yaml` now states the policy, and
`dpdmrc-exclude-policy.declapract.integration.test.ts` clamps the empty list. the **fallback
drop** did not. one of two halves shipped, and the clamp guards the half that did.

⇒ so this is not a fresh find; it is #581's unfinished half, re-measured.

## .the fix

```jsonc
"test:lint:cycles": "dpdm … --exclude \"$(yq -r '.exclude // [] | join(\"|\")' .dpdmrc.yaml)\" …"
```

`// []` before the `join` yields an empty string where `.exclude` is absent — which is what
`^$` reached for, and is what dpdm wants (an empty `--exclude` and a `^$` exclude mean the
same to it).

## ⚠️ .the stamp is NOT uniform — a re-stamp sweep is owed

read across `node_modules` on 2026-09-11, ~12 packages carry a `cycles` entry and they disagree:

| shape | example |
|---|---|
| the filter, with the dead tail | most |
| the filter, **no** tail | `domain-objects` |
| a literal `--exclude '^$'`, no yq at all | `type-fns`, `iso-time`, `helpful-errors` |

⇒ the template edit alone does not reach the drifted repos. several need a re-stamp to pick it
up, and the third row does not use yq at all — so a sweep keyed on the yq filter will miss it.

## .the clamp it owes

extend `dpdmrc-exclude-policy.declapract.integration.test.ts`, which already parses the shipped
`.dpdmrc.yaml`: run the gate's filter **byte-identical** against a doc that OMITS `.exclude`,
and assert it exits 0 with empty output.

🔴 seen to bite: against the current `// "^$"` form that arm must go **red**. it will — the
current form raises on both engines, which is the whole measurement above.

## .see also

- `ehmpathy/declapract-typescript-ehmpathy` #581 — the row that named this fix; its other half shipped
- `rule.forbid.dpdm-exclude-change` — the org policy the empty list serves, unaffected by this
- consumer-side note: `uladkasach/dev-env-setup` `5.17.yq`'s verify runs this filter
  byte-identical and deliberately asserts the `.exclude`-**present** arm only, since the
  fallback branch is an upstream defect rather than a fact about which yq is installed

=================== #613 🎙️ task - fix(persist-with-rds): resources.parameters.ts jsdoc closes itself — every adopter's lint fails to parse

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(persist-with-rds): resources.parameters.ts jsdoc closes itself — every adopter's lint fails to parse
**description**
## .what

`persist-with-rds`'s best-practice `provision/aws/resources.parameters.ts` ships a jsdoc block
that **closes itself**, so the emitted file is not valid typescript. biome cannot parse it, and
every adopter's `pnpm fix` exits 1.

found at `declapract-typescript-ehmpathy@0.49.12` (then `@latest`) while svc-chat ran
`rhx declapract.upgrade exec`.

## .where

`src/practices/persist-with-rds/best-practice/provision/aws/resources.parameters.ts:73`

```ts
 * .note = the two cicd credentials are pinned in the prod plan role's iam policy as SLASH paths
 *         with NO tier segment — `parameter/*/svc-*/database/role/cicd/for-plan/*` and
 *         `.../for-apply/*`. that pin's arn needs literal `/` separators after `parameter/`, so a
```

`parameter/` + `*` + `/` is the sequence `*/`. it terminates the block comment mid-line.
`svc-*/` repeats it, and `for-plan/*` + the next line's ` and` compound it. each character after
the first `*/` is read as code.

## .the blast radius

`pnpm fix` emits **17 parse errors** and exits 1. a sample, verbatim:

```
provision/aws/resources.parameters.ts:73:52 parse
  × Expected an expression for the left hand side of the `*` operator.
provision/aws/resources.parameters.ts:73:63 parse
  × Invalid regex flag
provision/aws/resources.parameters.ts:73:73 parse
  × Expected an expression but instead found 'for'.
provision/aws/resources.parameters.ts:82:1 parse
  × expected `;` but instead found `export`
provision/aws/resources.parameters.ts format
  × Code formatting aborted due to parsing errors.
```

two downstream symptoms that mislead a reader, both artifacts of the aborted parse:

- `noUnusedVariables` falsely flags `getAllParameters` as unused, and offers an unsafe fix that
  renames it to `_getAllParameters` — which would break `resources.ts`'s import
- the formatter refuses the whole file

⇒ this reproduces in **every repo** that adopts `persist-with-rds` at this version. it is not
svc-chat-specific.

## .why a downstream repo cannot fix it

the file is an **enforced** best-practice artifact. proven in svc-chat:

1. edited line 73 to remove both `*/` sequences
2. re-ran `rhx declapract.upgrade exec`
3. `declapract apply` restored the broken line verbatim — identical 17 errors

and 0.49.12 was already `@latest`, so no published version carried a fix. the only lever a
downstream repo holds is a pin back to 0.47.75, which defeats the upgrade.

## .the fix

rewrite the arn in the comment so no `*/` appears inside it. the prose must survive — the note
explains why the two cicd param names differ in shape from the crud one, and that reason carries
real weight. one shape that works:

```ts
 * .note = the two cicd credentials are pinned in the prod plan role's iam policy as SLASH paths
 *         with NO tier segment — `parameter/<org>/svc-<name>/database/role/cicd/for-plan/<star>`
 *         and `.../for-apply/<star>`. that pin's arn needs literal `/` separators after
 *         `parameter/`, so a dotted name cannot match it and the plan role gets ciphertext or a
 *         denial, forever. ...
```

any substitution for the literal `*` works, so long as no `*` sits immediately before a `/`.

## .the clamp

a regression test that goes red under the un-fixed template. the cheapest honest shape: assert
every `best-practice/**/*.ts` template parses clean. a narrower one: assert no emitted template
holds a stray `*/` between the `/**` that starts a block comment and the `*/` that ends it.

⚠️ the class is wider than this one line — **any** best-practice ts template can carry a glob or
an arn in a comment. clamp the class, not the instance.

## .verify

```sh
# after the fix is released, in a persist-with-rds adopter:
rhx declapract.upgrade exec   # must reach "shell yeah!"
```

## .provenance

reported from `ahbode/svc-chat`, branch `beav/feat-declapract-upgrade`, route
`.route/v2026_09_18.declapract.upgrade`, stone `1.upgrade.invoke` — halted on this.

upgrade path that surfaced it: `declapract-typescript-ehmpathy` 0.47.75 → 0.49.12
(`declapract` 0.13.26 → 0.13.27).

=================== #612 🎙️ task - fix(useKeyrack): bar imds, so an ambient instance role cannot silently replace a keyrack credential

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(useKeyrack): bar imds, so an ambient instance role cannot silently replace a keyrack credential
**description**
## the defect

`useKeyrack` SUPPLIES the correct credential. it does not BAR the wrong one.

on any host with an instance role — every ec2 grove box — the aws sdk default chain reaches IMDS on its own, with **no env var to hint that it did**. so a suite whose keyrack step silently no-ops still receives a credential, authenticates against the **wrong account**, and fails with an action-level `AccessDenied` that reads exactly like an IAM policy gap.

measured in `ehmpathy/sdk-config`: 3 integration tests + 2 whole acceptance suites (0/71) were written off across **eight review rounds** as a **missing IAM grant that needed a human**. they were not. the profile was fine; the sdk never used it.

| | account | role |
|---|---|---|
| keyrack profile `ehmpathy.test.ehmpath` | 805192865516 | `ehmpathy-demo-for-grove` |
| what the suites actually used | 261599400667 | `ahbode-camp-grove-role` |

## the measurement

one probe per state, via `client.config.credentials()` on `@aws-sdk/client-ssm`:

| state | resolved to |
|---|---|
| `AWS_*` purged, imds live | `ASIATZ2E…` (instance role) |
| `AWS_PROFILE` set to a **nonexistent** profile | `ASIATZ2E…` (instance role) |
| `AWS_*` purged + `AWS_EC2_METADATA_DISABLED=true` | ⛔ `CredentialsProviderError` |

⛔ **row 2 is the load-bearer.** a SET profile is not a RESOLVED profile — the chain falls through to IMDS whenever `fromIni` cannot complete, which includes an sso session that expires mid-suite (a keyrack grant lasts ~9h).

⇒ so `mode: 'strict'` is **necessary and not sufficient**: it proves the key was granted at t=0 and proves naught about minute 40 of a long run.

## the fix — one line, in `useKeyrack`

```ts
if (!requiresAwsAuth) return;

// bar imds, so this is keyrack-or-none rather than keyrack-or-whatever-the-host-offers
process.env.AWS_EC2_METADATA_DISABLED = 'true';
```

placed **after** the `requiresAwsAuth` gate on purpose: it binds only repos that declare BOTH a keyrack manifest and an aws account — exactly the population "keyrack or none" is a true statement about. a repo with no keyrack returns above, so its instance role is left alone.

🔴 **it belongs IN `useKeyrack`, not beside it.** a separate `useAwsCredsFromKeyrackOnly()` was built first and then folded in: a caller must not be able to remember one and forget the other. "keyrack or none" should be what `useKeyrack` MEANS.

## second, unrelated: the practice file does not compile under a consumer tsconfig

`exportAwsCredentialsFromSsoProfile` passes `{ cause: error }` raw. `helpful-errors@1.7.3` types `cause?: Error`, and a `catch` binding is `unknown` under `useUnknownInCatchVariables`, so:

```
src/.test/useKeyrack.ts(75,11): error TS2322: Type 'unknown' is not assignable to type 'Error | undefined'.
```

worked around locally with a narrow that keeps the real cause and preserves a non-Error throw message, with no `as` cast:

```ts
{ cause: error instanceof Error ? error : new Error(String(error)) }
```

## one open question for the maintainer

step 5 trusts static creds that are already present:

```ts
if (process.env.AWS_ACCESS_KEY_ID) { delete process.env.AWS_PROFILE; ...; return; }
```

a full "keyrack or none" would also **purge** `AWS_*` before `keyrack.source`, which closes the stale-shell-export hole — but that directly contradicts this hatch, so it was NOT done unilaterally. the hatch was never the hole we hit (an instance role sets no env vars at all), so the IMDS bar alone closes the measured defect.

⇒ is the hatch a deliberate escape valve to keep, or a second ambient source to bar?

## impact

after the fix, in `sdk-config`: **311 tests, 0 failed** — incl. the 3 integration tests and the 2 acceptance suites previously believed to need a human's IAM grant.

=================== #611 🎙️ task - tests: a test run with no AWS_PROFILE silently acquires the box's ec2 instance role

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
tests: a test run with no AWS_PROFILE silently acquires the box's ec2 instance role
**description**
# the defect

a test run with no `AWS_PROFILE` and no static keys **silently acquires the box's ec2 instance
role**, and runs against whatever account that role belongs to.

measured on a real host: the wrong account resolved, the suite ran, and no output said so.

## why it happens — the aws sdk credential chain, from its own source

`@aws-sdk/credential-provider-node/dist-cjs/index.js`:

```js
defaultProvider = memoizeChain([
  fromEnv, fromSSO, fromIni, fromProcess, fromTokenFile,
  async () => (await remoteProvider(init))(),   // <-- the last link before the throw
  async () => { throw new CredentialsProviderError("Could not load credentials..."); },
]);

const remoteProvider = async (init) => {
  // ...
  return fromInstanceMetadata(init);            // <-- IMDS: the box's own ec2 role
};
```

⇒ when every prior link declines, the chain **does not fail** — it reaches IMDS and succeeds with
an identity nobody selected. **no env var is involved**, which is why no check of `AWS_PROFILE` or
`AWS_ACCESS_KEY_ID` can detect it.

this is `rule.forbid.failhide` at the credential layer: the wrong outcome is indistinguishable
from the right one.

---

# the two repairs, and both are one line each

## 1. refuse IMDS outright

the same file carries the off switch:

```js
const ENV_IMDS_DISABLED = "AWS_EC2_METADATA_DISABLED";
if (process.env[ENV_IMDS_DISABLED] && process.env[ENV_IMDS_DISABLED] !== "false") {
    return async () => { throw new CredentialsProviderError("EC2 Instance Metadata Service access disabled"); };
}
```

so, at the top of `jest.integration.env.ts` and `jest.acceptance.env.ts` — **above** the
`keyrack.source` call, since it must precede any aws client construction:

```ts
process.env.AWS_EC2_METADATA_DISABLED = 'true';
```

**ci is unaffected**: github oidc resolves at `fromEnv` / `fromTokenFile`, both ABOVE
`remoteProvider` in that chain.

## 2. failfast when keyrack cannot grant

`jest.integration.env.ts` currently reads:

```ts
keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'lenient' });
```

`lenient` proceeds **silently** when it has no grant to make — which is exactly the state that
lets the chain fall through to IMDS. `strict` refuses, and its error already names the fix.

```ts
keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'strict' });
```

the extant `!process.env.CI` guard on that line already keeps ci off this path, so strict costs
ci naught.

## 3. the acceptance discriminant tests the wrong thing

`jest.acceptance.env.ts` currently reads:

```ts
const hasAwsCredentials = !!(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE);
keyrack.source({ env: 'test', owner: 'ehmpath', mode: hasAwsCredentials ? 'lenient' : 'strict' });
```

⚠️ **the presence of a credential from ANY account disarms the check.** that is the precise state
that makes the check matter, so the guard is weakest exactly when it is most needed.

the question it means to ask is *"is this ci?"* — so ask that:

```ts
keyrack.source({ env: 'test', owner: 'ehmpath', mode: process.env.CI ? 'lenient' : 'strict' });
```

the `.note` explains why ci is lenient: ci authenticates via oidc, which sets `ACCESS_KEY_ID` and
no `AWS_PROFILE`, so keyrack has no grant to make there and `strict` would refuse a healthy run.

---

# the bound — what this does NOT close

⚠️ `AWS_EC2_METADATA_DISABLED` disables **IMDS**, never "ambient" in general. from the same
source, the container check runs **first** and returns early:

```js
if (process.env[ENV_CMDS_RELATIVE_URI] || process.env[ENV_CMDS_FULL_URI]) {
    return chain(fromHttp(init), fromContainerMetadata(init));   // <-- returns BEFORE the disable check
}
if (process.env[ENV_IMDS_DISABLED] ...) { throw }
```

⇒ on ecs/fargate, `AWS_CONTAINER_CREDENTIALS_RELATIVE_URI` still resolves and bypasses the flag.

**the complete repair is an account assertion** — call `sts:GetCallerIdentity` after the source
and compare `Account` against the expected id. that catches a wrong account from ANY source,
including a keyrack pointed at the wrong org, which a source-based rule cannot.

that is the better fix and it is larger, so it is named here rather than proposed inline.

---

# a second, separate defect found in the same read

`jest.integration.env.ts` and `jest.acceptance.env.ts` both gate their aws credential check on:

```ts
const requiresAwsAuth = declapractUseContent.includes('awsAccountId');
```

a repo whose `declapract.use.yml` declares `organizationName` and `projectName` but **no**
`awsAccountId` evaluates this to `false` — so the *"no aws credentials present"* throw **never
fires**, in either file, however much aws the repo actually uses.

measured on `ehmpathy/sdk-aws-lambda`, which invokes real lambdas in account `805192865516` from
its integration and acceptance suites, and whose `declapract.use.yml` carries no `awsAccountId`.

⇒ so the one guard meant to catch an absent credential is inert in exactly the repo shape that
most needs it. worth its own look — the detection should probably key on something the repo
cannot omit by accident.

---

# scope

- `practices/tests/best-practice/jest.integration.env.ts`
- `practices/tests/best-practice/jest.acceptance.env.ts`

every repo that runs aws-touching tests on a box with an instance role carries this hole, which
is why it belongs here rather than in one repo.

## verified downstream

landed and run on `ehmpathy/sdk-aws-lambda` (branch
`beav/feat-input-only-validation-and-hydration`), across all three of its `keyrack.source` sites
(the two jest env files plus `provision/aws.infra/account=demo/resources.ts`):

- types · lint · format — pass
- integration — **7 passed, 0 failed** with IMDS disabled and strict mode on
- acceptance — runs; its failures are unrelated to this change

⇒ so the positive control holds: the levers do not break a healthy run.

=================== #610 🎙️ task - fix(expo): node-linker=hoisted makes version contention decisive — print the contention set at flip time

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(expo): node-linker=hoisted makes version contention decisive — print the contention set at flip time
**description**
## the defect — the practice flips the linker and leaves the consumer to find the contention

`defineExpectedNpmrcContents.ts:34` adds `node-linker=hoisted` to `.npmrc`, gated on
`context.projectPractices.includes('cicd-app-react-native-expo')`. expo needs it — metro cannot walk
pnpm's symlinked tree.

the flip is **correct and required**. what it does is make exactly one copy of each package win the
root slot, so any package with two versions in the graph becomes decisive rather than latent.

two of those broke `ahbode/app-protools-native` on the upgrade:

| package | the symptom | why the flat tree made it decisive |
|---|---|---|
| `@commitlint/*` | `TypeError: format is not a function` — every commit dies in the husky `commit-msg` hook | `whodis-client` ships `commitlint@^17` as a **runtime** dep; the repo declares `@commitlint/cli@19.5.0` as a devDep. under npm's nested layout each got its own subtree |
| `type-fns` | **blank page** — every render assertion fails with `element(s) not found`, and no stack line names it | a `withAssure` ↔ `HelpfulError` cycle leaves `HelpfulError` undefined at module-eval time when the older copy wins |

⇒ 🔴 **neither symptom names its cause.** the first points at commitlint's formatter; the second
points nowhere at all. both cost multiple rounds to trace to the linker flip.

## 🟡 the practice ALREADY documents both — and that is the finding

`.agent/repo=.this/role=any/briefs/howto.pnpm-expo-hoisted-linker.md`, in this repo, names both by
symptom:

> symptoms seen in the wild (`app-hometools-native`):
>
> - `@commitlint/format` "is not a function" — a wrong `@commitlint/*` version hoisted to root
> - `type-fns` "Class extends value undefined" — a stale `type-fns` pulled by `whodis-react` hoisted
>   over the intended one

and it names this repo by name, in its closing line:

> (the `app-protools-native` migration handles this as a `package.json` contains-merge:
> `overrides` / `resolutions` → `pnpm.overrides`.)

⇒ **the diagnosis existed before the route opened, with the remedy written out.** a consumer spent
five cicd rounds to re-derive it.

## .the brief also DECLINES half of the obvious ask, correctly

> | liftable into declapract | NOT liftable (repo-specific) |
> |---|---|
> | the `node-linker=hoisted` block | the specific `overrides` VERSIONS |
>
> do NOT hardcode version pins into the practice — they would be wrong for the next repo.

**that argument is right.** a pin that fixes this repo's tree is wrong for a repo with a different
one; to ship it trades a loud runtime defect for a silent wrong pin.

⇒ so this is **not** a request to ship overrides. the brief settled that.

## the ask — surface the knowledge at the moment it fires

the gap is not knowledge. it is **delivery**: a rung-1 artifact helps only a reader who finds it, and
the measured evidence is that a reader did not.

> when `declapract fix` appends `node-linker=hoisted`, that is the one moment the practice can
> enumerate the risk. run `pnpm why`, print every package with more than one version in the graph,
> and cite the brief beside the list.

```
🟡 node-linker=hoisted added — one copy of each package now wins the root slot

   packages with more than one version in your graph:
     ├─ @commitlint/cli   17.8.1, 19.5.0
     ├─ type-fns          0.8.1, 1.21.3
     └─ …

   ⇒ any of these may now load a different copy at runtime.
      see howto.pnpm-expo-hoisted-linker.md for the pnpm.overrides remedy.
```

**no version pin is shipped.** the practice prints the contention set and points at its own brief;
the consumer decides the pins, which is exactly the split the brief already argues for.

## .why the print matters more than it looks

both symptoms above are **silent about their cause**. a consumer who sees the list at flip time has
the two package names in hand before the first red check. a consumer who does not gets a crashed git
hook and a blank page, and no path from either to the linker.

⇒ the ask is the brief's own stated position **plus the delivery mechanism the brief lacks**.

## .a second owner, dispatched separately

`whodis-client` declares `commitlint` as a runtime dependency and pins `type-fns` exact at `0.8.1` —
so it is the single upstream source of **both** contentions here. that has its own dispatch against
`whodisio/whodis-client`; it is a cheaper fix with a wider blast radius, and it does not replace this
ask (the next consumer will meet a different pair of packages).

## .context

found on `ahbode/app-protools-native` @ `vlad/fix-bump-practs`, a `0.49.12` upgrade. the ask was
first drafted to include the version pins and was **narrowed** after a read of the brief above, which
had already declined that half with a sound argument.

=================== #609 🎙️ task - fix(expo): the upgrade adds a depcheck blocker and a metro-config require that violates it, with no ignore

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(expo): the upgrade adds a depcheck blocker and a metro-config require that violates it, with no ignore
**description**
> 🟡 **not a duplicate of [#604](https://github.com/ehmpathy/declapract-typescript-ehmpathy/issues/604) §1.**
> that section asks for a metro **blockList**, so playwright stays out of the expo-router graph. this
> is a **depcheck** report about an undeclared dependency. the two touch the same file and name the
> same package, and share no defect.

## the defect — the upgrade adds a depcheck blocker and a violation of it, together

two pieces of one upgrade, each sound alone:

1. the lint gate now runs depcheck as a **blocker** — `"test:lint:deps": "npx depcheck -c ./.depcheckrc.yml"`, wired into `test:lint`
2. the same upgrade adds a `require('metro-config/…')` inside the declared `metro.config.js`

`metro-config` is **deliberately undeclared** — expo owns the bundled metro, so a consumer pins no
version of it. depcheck sees a require for a package that is not in `package.json` and reports it
missing:

```
Missing dependencies
* metro-config: ./metro.config.js
```

⇒ the gate the upgrade installs fails on the file the same upgrade writes. every expo consumer meets
a red `test:lint` on the first run after upgrade.

## the ask

`.depcheckrc.yml` is a declared file. **the practice that adds the `metro-config` require should add
the matching ignore in the same diff**:

```yaml
ignores:
  - metro-config   # expo owns the bundled metro; deliberately undeclared
```

that is the repair `ahbode/app-protools-native` shipped by hand, and the one every other expo
consumer will re-derive from the same error.

## .why the pair is the defect, not either half

- the depcheck gate is correct and worth having
- the `metro-config` require is correct — it is how the metro exclusion list is reached
- 🔴 **what is absent is the ignore that reconciles them**, and both halves ship in one upgrade

⇒ so this is not a request to drop the gate or to declare the package. it is a request that the
practice which creates the violation also declare its exemption.

## .the require path varies by metro version, and that matters here

#604 §1 already records this, and it bears on the ignore too — `app-hometools-native` (expo sdk 54 /
metro 0.83) lands on `metro-config/private/defaults/exclusionList`, while `app-protools-native` on
its current metro lands on `metro-config/src/defaults/exclusionList`.

both paths point into the same **package**, so one `metro-config` ignore covers both. worth a note so
the fix is not written per-path.

## .context

found on `ahbode/app-protools-native` @ `vlad/fix-bump-practs`, a `0.49.12` upgrade. it was initially
recorded on our side as already covered by #604 §1 — a **name collision**, since both concern
`metro.config.js` and the string `metro-config`. a read of #604's body settled it: the word `depcheck`
does not occur there.

=================== #608 🎙️ task - fix(cicd): the expo usecase carries provision-github's migration and no provision.yml caller for it

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(cicd): the expo usecase carries provision-github's migration and no provision.yml caller for it
**description**
## the defect — a usecase carries a migration and no caller for it

`app-react-native-expo` composes `provision-github`, whose migration moves a repo off terraform:

```
src/practices/provision-github/bad-practices/terraform-github/provision/github/environment/main.tf
…/environment/versions.tf   …/product/repository.tf        <- check = EXISTS, so `fix` deletes them
src/practices/provision-github/best-practice/provision/github.repo/resources.ts   <- the replacement
```

**that half is correct and deliberate.** the deletion is declared as a bad practice; the replacement
is declared as the best practice.

🔴 **the other half is absent.** the `provision.yml` workflow that *consumes* those files is declared
by `cicd-package` and `cicd-service`, and **neither is in the expo usecase**:

```yaml
# dist/useCases.yml
app-react-native-expo:
  extends: [typescript-project-core]      # -> cache, cicd-common, husky, format, lint, pnpm, …
  practices:
    - cicd-app-react-native-expo
    - provision-github
    - lint-react
    - lint-react-native
    - tests-expo
    - typescript-expo
```

so on an expo repo the upgrade deletes `provision/github/**` and leaves the repo-owned
`provision.yml` pointed at the now-empty directory. `terraform validate` then exits 1, and the
`github / plan` check fails on every branch.

## .the practice is NOT at fault for its own callers

worth a note up front, because it is the obvious first read and it is wrong. **both declared callers
were already migrated**:

```
$ rhx git.repo.get lines --in ehmpathy/declapract-typescript-ehmpathy \
    --paths 'src/practices/cicd-package/best-practice/.github/workflows/provision.yml' --words 'wish-path'
  25: wish-path: provision/github.repo/resources.ts

$ … --paths 'src/practices/cicd-service/best-practice/.github/workflows/provision.yml' --words 'wish-path'
  56: wish-path: provision/github.repo/resources.ts
```

⇒ **the gap is in what the usecase COMPOSES, not in what the practice declares.** an expo repo gets
the migration and gets no practice that owns the caller it invalidates.

## the ask

> either `cicd-app-react-native-expo` declares the `provision.yml` that `provision-github`'s
> migration presumes, or `provision-github` declares it directly.

## .the landed precedent — #573's D28

[#573](https://github.com/ehmpathy/declapract-typescript-ehmpathy/issues/573) already shipped exactly
this mechanism for a different usecase:

> the 5.1 execution landed a `provision.yml.declapract.ts` `contents` fn that emits the full superset
> when `context.projectPractices.includes('persist-with-rds')` and STRIPS the 4 rds jobs when it does
> not … clamped two ways: **unit** … **end-to-end pipeline** … runs the REAL `executeApply` against a
> `genTempDir` consumer for BOTH usecases

⇒ so this is a request to **extend a landed, tested pattern** — one more branch in a `contents` fn
that already gates on `projectPractices`, with the same two clamps.

## .why a post-fix reconciliation check would NOT catch it

the peer ask on this route asks for a post-fix pass that re-runs every declared check. **that cannot
see this defect**: a check reads declarations, and `provision.yml` has none for this usecase.

⇒ the two asks are independent by construction, which is why they are dispatched separately.

## .the repair on the consumer side

`ahbode/app-protools-native` rewired its `github` job by hand — the `provision/github/**` terraform
steps replaced with a `declastruct` call at `provision/github.repo/resources.ts`. every expo repo
that adopts this practice will re-derive that same edit from a `terraform validate` exit code that
names none of it.

## .context

found on `ahbode/app-protools-native` @ `vlad/fix-bump-practs`, a `0.49.12` upgrade. the ask was
first drafted as *"a migration owes the callers of what it deletes"* and was **refuted** by the two
`wish-path` lines above before it was dispatched — the practice does owe its callers, and does pay
it. the ask that holds is the narrower one stated here.

=================== #607 🎙️ task - fix(cicd): a declared file with a shipped fix is left unapplied — a post-fix reconciliation pass (follow-on to #573)

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(cicd): a declared file with a shipped fix is left unapplied — a post-fix reconciliation pass (follow-on to #573)
**description**
> **follow-on to [#573](https://github.com/ehmpathy/declapract-typescript-ehmpathy/issues/573)** —
> that issue's final section parks the general caller/callee reconciliation as a follow-on. this is a
> **second instrument** on that same class, and it argues for the post-fix form on one ground: it
> **repairs** where the cross-file form only **reports**.

## the defect — a declared file, with a shipped fix, left unapplied

`cicd-common` declares `.github/workflows/test.yml` with an `EQUALS` check **and** a fix that writes
the declared contents verbatim:

```ts
// src/practices/cicd-common/best-practice/.github/workflows/test.yml.declapract.ts
/**
 * .what = validates test.yml matches the template exactly
 * .why = secrets: inherit passes all secrets to .test.yml; firewall handles key filter at runtime
 */
export const check = FileCheckType.EQUALS;
export const fix: FileFixFunction = async (_contents, context) => {
  return { contents: context.declaredFileContents ?? '' };
};
```

after an upgrade of `ahbode/app-protools-native` to `0.49.12`, the repo's `test.yml` was **not**
equal to that declaration. the whole difference is one comment:

```diff
- creds-aws-role-arn: ${{ vars.CREDS_CICD_AWS_PREP_OIDC_ROLE_ARN }} # use aws auth via oidc…
+ # the org-wide prep oidc role. it trusts repo:ahbode/*:* …
+ creds-aws-role-arn: ${{ vars.CREDS_CICD_AWS_PREP_OIDC_ROLE_ARN }}
```

the arn value is character-identical. so the **declaration was already correct** and the fix already
knew how to write it — the file simply never reached the declared state.

## the cost — two defects, five cicd rounds, derived by hand

the repo's `test.yml` was the caller for a reusable `.test.yml` callee, and it drifted on two axes at
once. both were rediscovered from symptoms:

| symptom | what it actually was |
|---|---|
| `startup_failure`, **1 second, no log at all** | the caller passed inputs the callee no longer declares |
| `Not authorized to perform sts:AssumeRoleWithWebIdentity` on two shards | the caller named four per-repo static-key role arns; the declaration names the org-wide oidc one |

⇒ 🔴 **the first is the least diagnosable outcome in all of cicd.** github validates a
`workflow_call` signature **at schedule time**, so there is no job, no step, and no log line — just a
red check and a one-second duration. it cost several rounds to even locate.

**and the declared file already held the fix for both.** the correct inputs and the correct arn were
in the practice the whole time.

## the ask — a post-fix reconciliation pass

after `declapract fix` applies its fixes, **re-run every declared check** and fail loud on any file
still in violation:

```
✋ 1 file remains in violation after fix

  .github/workflows/test.yml
    ├─ declared by: cicd-common
    ├─ check: EQUALS
    └─ diff: 1 hunk (run `declapract plan` to view)
```

today a **declared-and-unapplied** file is indistinguishable from a satisfied one. the upgrade
reports success, the repo is quietly wrong, and the next signal is a red check with no log.

## .why the post-fix form, and not #573's cross-file form

| instrument | what it compares | on this defect |
|---|---|---|
| #573's parked follow-on | the caller's `uses:` against the callee's declared `inputs:`/`secrets:` | **reports** the drift |
| this ask | the **declared** file against the **applied** file, after `fix` runs | **repairs** it |

the cross-file guard would have raised a defect a human then fixes by hand. the post-fix pass finds
the file unequal and **already holds the correct content** — it closes the loop with no human in it.

⇒ the two compose rather than compete: the cross-file guard catches drift a declaration does not
cover; this one catches every drift a declaration **does** cover and which `fix` simply did not land.

## .why it is cheap

the machinery exists. `declapract plan` already computes exactly this comparison for every declared
file. the ask is to run that same pass **once more, after fix**, and to exit non-zero if it is not
empty.

## .context

found on `ahbode/app-protools-native` @ `vlad/fix-bump-practs`, a `0.49.12` upgrade. the diagnosis
initially read as an **ownership** gap (*"the practice declares the callee but not the caller"*) and
was corrected mid-route when the `.declapract.ts` companion was read: the caller **is** declared,
with a check and a fix. the correction is what produced this ask.

=================== #604 🎙️ task - fix(expo): metro blockList is mandatory for the playwright practice, plus the two-runner acceptance split (amends #603)

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(expo): metro blockList is mandatory for the playwright practice, plus the two-runner acceptance split (amends #603)
**description**
> **amends #603** — the token that filed #603 can create but not edit issues, so this carries the follow-up findings. read together with #603.

## .1 — the critical piece #603 omits: the metro blockList

**without this, the practice as described in #603 actively breaks any expo consumer's build.**

`expo-router` treats every file under `src/app/**` as a route. a colocated `*.play.test.ts` therefore enters the app graph, drags `@playwright/test` → `playwright-core` into the web bundle, and **`npm run build:web` fails outright**:

```
SyntaxError: node_modules/playwright-core/lib/coreBundle.js:
Static class blocks are not enabled.
Please add `@babel/plugin-transform-class-static-block` to your configuration.
```

the app cannot build at all — this is not a test failure, it is a hard build break on the consumer's release path. a consumer that adopts #603 as written ships a repo that cannot build.

the fix belongs in `metro.config.js`:

```js
// exclude playwright test files from the bundle.
// .why = expo-router treats every file under src/app as a route, so a colocated
//        *.play.test.ts would pull @playwright/test into the app graph and break
//        the web build (playwright-core uses static class blocks metro cannot parse).
// .note = metro 0.83 (sdk 54) locked internal subpaths behind package "exports" and
//         moved the helper to /private/; older metro keeps it at /src/. accept either,
//         then unwrap the esm default export.
const exclusionListModule = (() => {
  try {
    return require('metro-config/private/defaults/exclusionList');
  } catch {
    return require('metro-config/src/defaults/exclusionList');
  }
})();
const exclusionList = exclusionListModule.default ?? exclusionListModule;
config.resolver.blockList = exclusionList([/.*\.play\.test\.ts$/]);
```

two notes for whoever implements it:

- **the require path varies by metro version.** `app-hometools-native` (expo sdk 54 / metro 0.83) resolves `metro-config/private/defaults/exclusionList`; `app-protools-native` on its current metro resolves `metro-config/src/defaults/exclusionList`. the practice must tolerate both, or consumers break on whichever side they sit.
- **the jest exclusion is separate and still required.** `!**/*.play.test.{ts,tsx}` in the unit config does not substitute for the metro blockList.

verified end to end in `app-protools-native`: build went **fail → 6.5s green**, then 4/4 render tests passed across chromium desktop + mobile.

## .2 — the org runs TWO acceptance conventions, and the tooling knows only one

this reframes the "runner split" bonus in #603 from a nitpick into the core question the practice must answer.

surveyed three repos:

| repo | kind | acceptance runner | config | target |
|------|------|-------------------|--------|--------|
| `app-storefronts-web` | web / serverless | **jest** | `jest.acceptance.config.ts` | blackbox contract, `LOCALLY=true\|false` + `STAGE` |
| `app-hometools-native` | expo | **playwright** | `playwright.config.ts` | render/visual, localhost only |
| `app-protools-native` | expo | **playwright** | `playwright.config.ts` | render/visual, localhost only |

so:

- `rhx git.repo.test --what acceptance` hard-requires `jest.acceptance.config.ts`. it works for storefronts and throws a constraint error on both expo repos:
  ```
  🐚 git.repo.test --what acceptance
     ├─ status: constraint
     └─ error: jest.acceptance.config.ts not found
  ```
- `app-storefronts-web` has **zero** playwright usage — no config, no `*.play.test.ts`, no dependency. it has no render/visual layer at all.

**the question the practice must settle:** is "acceptance" one concept with two runners, or two concepts?

a defensible split, offered as a starting point:

- **acceptance** = blackbox contract verification (jest) — what storefronts does, what `git.repo.test --what acceptance` means today
- **render** (or **visual**) = the browser paint check (playwright) — what the expo repos do

under that split the expo practice should wire `test:render` / `test:play`, not overload `test:acceptance`, and `git.repo.test` gains a `--what render` that detects `playwright.config.ts`. that keeps one word per concept and stops the skill and the practice from disagreement.

the expo repos currently point `test:acceptance` at playwright, so whichever way this lands, one of the two sides needs a rename.

## .3 — the localhost auth wall bounds what render tests can cover

noted in #603 but worth the sharper framing, since it shapes the practice's scaffold:

whodis refuses a `localhost` origin by design (`getDomainOfApiForEnv` throws `ReservedDomainError`), so render tests at localhost reach **only** `(public)` routes. every authed screen is uncoverable by the pattern as specified.

`app-storefronts-web` already solves the analogous problem for its jest acceptance layer with `LOCALLY=true|false` + `STAGE=<env>`, so the suite can run against a deployed environment with real credentials. the expo render practice likely wants the same escape hatch — a mode that targets deployed prep rather than localhost — or it permanently caps render coverage at the public surface.

## .context

surfaced in the declapract upgrade of `ahbode/app-protools-native` (route `.route/v2026_08_28.declapract.upgrade`), where the pattern from `app-hometools-native` was hand-copied and the metro omission broke the build.

=================== #603 🎙️ task - feat(expo): adopt playwright render/visual acceptance practice for expo projects

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
feat(expo): adopt playwright render/visual acceptance practice for expo projects
**description**
## .what

declapract ships no acceptance-test practice for **expo** projects, so every expo repo either stubs `test:acceptance` as `echo 'todo'` or hand-rolls the playwright setup by copy from a peer repo.

adopt the extant, proven expo-web render/visual acceptance pattern as a declapract practice, so `test:acceptance` means a real check on every expo consumer.

## .why

two expo repos already run this pattern. `ahbode/app-hometools-native` has it; `ahbode/app-protools-native` just hand-copied it as part of a declapract upgrade. that hand-copy is the signal: the practice belongs upstream, not in each consumer.

today a consumer that runs the upgrade gets:

```json
"test:acceptance": "echo 'todo'",
"test:acceptance:locally": "echo 'todo'",
```

so `npm test` reports green with zero render coverage. an expo app can ship a blank screen and the suite stays silent. that is a failhide at the practice level.

---

## ⚠️ .the critical piece — the metro blockList

**without this, the practice actively breaks any expo consumer's build. a consumer that adopts the pattern without it ships a repo that cannot build.**

`expo-router` treats every file under `src/app/**` as a route. a colocated `*.play.test.ts` therefore enters the app graph, drags `@playwright/test` → `playwright-core` into the web bundle, and **`npm run build:web` fails outright**:

```
SyntaxError: node_modules/playwright-core/lib/coreBundle.js:
Static class blocks are not enabled.
Please add `@babel/plugin-transform-class-static-block` to your configuration.
```

this is not a test failure — it is a hard build break on the consumer's release path.

the fix belongs in `metro.config.js`:

```js
// exclude playwright test files from the bundle.
// .why = expo-router treats every file under src/app as a route, so a colocated
//        *.play.test.ts would pull @playwright/test into the app graph and break
//        the web build (playwright-core uses static class blocks metro cannot parse).
// .note = metro 0.83 (sdk 54) locked internal subpaths behind package "exports" and
//         moved the helper to /private/; older metro keeps it at /src/. accept either,
//         then unwrap the esm default export.
const exclusionListModule = (() => {
  try {
    return require('metro-config/private/defaults/exclusionList');
  } catch {
    return require('metro-config/src/defaults/exclusionList');
  }
})();
const exclusionList = exclusionListModule.default ?? exclusionListModule;
config.resolver.blockList = exclusionList([/.*\.play\.test\.ts$/]);
```

two notes for whoever implements it:

- **the require path varies by metro version.** `app-hometools-native` (expo sdk 54 / metro 0.83) resolves `metro-config/private/defaults/exclusionList`; `app-protools-native` on its current metro resolves `metro-config/src/defaults/exclusionList`. the practice must tolerate both, or consumers break on whichever side they sit.
- **the jest exclusion is separate and still required.** `!**/*.play.test.{ts,tsx}` in the unit config does not substitute for the metro blockList.

verified end to end in `app-protools-native`: build went **fail → 6.5s green**, then 4/4 render tests passed across chromium desktop + mobile.

---

## ⚠️ .the org runs TWO acceptance conventions, and the tooling knows only one

this is the core question the practice must settle, not a footnote.

surveyed three repos:

| repo | kind | acceptance runner | config | target |
|------|------|-------------------|--------|--------|
| `app-storefronts-web` | web / serverless | **jest** | `jest.acceptance.config.ts` | blackbox contract, `LOCALLY=true\|false` + `STAGE` |
| `app-hometools-native` | expo | **playwright** | `playwright.config.ts` | render/visual, localhost only |
| `app-protools-native` | expo | **playwright** | `playwright.config.ts` | render/visual, localhost only |

so:

- `rhx git.repo.test --what acceptance` hard-requires `jest.acceptance.config.ts`. it works for storefronts and throws a constraint error on both expo repos:
  ```
  🐚 git.repo.test --what acceptance
     ├─ status: constraint
     └─ error: jest.acceptance.config.ts not found
  ```
- `app-storefronts-web` has **zero** playwright usage — no config, no `*.play.test.ts`, not even the dependency. it has no render/visual layer at all.

**the question: is "acceptance" one concept with two runners, or two concepts?**

a defensible split, offered as a starting point:

- **acceptance** = blackbox contract verification (jest) — what storefronts does, what `git.repo.test --what acceptance` means today
- **render** (or **visual**) = the browser paint check (playwright) — what the expo repos do

under that split the expo practice wires `test:render` / `test:play`, does not overload `test:acceptance`, and `git.repo.test` gains a `--what render` that detects `playwright.config.ts`. that keeps one word per concept and stops the skill and the practice from disagreement.

the expo repos currently point `test:acceptance` at playwright, so whichever way this lands, one side needs a rename.

---

## .the pattern to adopt

verified identical across both expo repos:

| piece | value |
|-------|-------|
| runner | `@playwright/test` (devDep, pinned) |
| config | `playwright.config.ts` at repo root |
| `testDir` | `./src` |
| `testMatch` | `**/*.play.test.ts` (colocated with the route) |
| webServer | `npm run build:web && npx serve dist -l 19006 --single` |
| projects | `chromium-desktop` (Desktop Chrome) + `chromium-mobile` (Pixel 5) |
| snapshots | `toHaveScreenshot`, `maxDiffPixelRatio: 0.05`, `animations: 'disabled'` |
| metro | `resolver.blockList` excludes `/.*\.play\.test\.ts$/` — **mandatory, see above** |
| jest | unit config must exclude `!**/*.play.test.{ts,tsx}` |
| commands | `test:acceptance`, `test:acceptance:locally`, `test:play`, `test:play:update` → `npx playwright test` |

## .the other two traps the practice must carry

1. **`--single` is mandatory.** expo web builds with `output: 'single'` (an SPA). without `serve dist --single`, every client-side route 404s and every render test fails for a reason that has zero to do with the app.

2. **the localhost auth wall bounds coverage.** whodis refuses a `localhost` origin by design (`getDomainOfApiForEnv` throws `ReservedDomainError`), so render tests at localhost reach **only** `(public)` routes. every authed screen is uncoverable by the pattern as specified.

   `app-storefronts-web` already solves the analogous problem for its jest layer with `LOCALLY=false STAGE=<env>`, so the suite runs against a deployed environment with real credentials. the expo render practice likely wants the same escape hatch — a mode that targets deployed prep rather than localhost — or it permanently caps render coverage at the public surface.

## .the ask

1. add the practice: `playwright.config.ts` + the `package.json` commands + **the metro blockList** + the jest exclusion
2. settle the acceptance-vs-render vocabulary (see above) before the commands harden across consumers
3. scaffold at least one example `*.play.test.ts` against a public route, so the consumer has a shape to copy
4. add `playwright-report/` and `test-results/` to the gitignore practice
5. decide + document whether screenshot baselines are committed (the peer repo commits them)
6. gate it to expo consumers only — a non-expo repo has no `build:web`
7. consider the deployed-target mode, so authed routes are reachable

## .context

surfaced in the declapract upgrade of `ahbode/app-protools-native` (route `.route/v2026_08_28.declapract.upgrade`), where the pattern from `app-hometools-native` was hand-copied and the metro omission broke the build. relates to the D6 adoption-candidate class from that upgrade's reflection stone.

=================== #601 🎙️ task - test:lint:cycles depends on an undeclared host binary (yq)

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
test:lint:cycles depends on an undeclared host binary (yq)
**description**
# 🌙 dream: re-seed — `test:lint:cycles` depends on an undeclared host binary, and fails OPEN when it is absent

- kind = reseed
- owner = **`ehmpathy/declapract-typescript-ehmpathy`** — not this repo
- caught 2026-09-11, from `.behavior/v2026_09_07.feat-caller-region-static-map`, stone
  `5.1.execution.from_vision`
- 🔴 **status = COMPOSED, NOT DISPATCHED** — `rhx radio.uses get` reports `global: blocked`

## .the cue that fired

`rhx git.repo.test --what lint` failed locally with **75 circular dependencies, every one of them
inside `node_modules`** and not one in `src/`:

```
01) node_modules/.pnpm/@aws-sdk+nested-clients@3.943.0/.../STSClient.js -> .../httpAuthSchemeProvider.js
...
75) node_modules/.pnpm/apollo-server-core@2.26.2/.../index.js -> ...
```

a report whose every row is third-party says nothing about this repo. it is a report that ran with
**no exclusions at all**.

## .the gap, precisely

```jsonc
// package.json — the stamped lint script
"test:lint:cycles": "dpdm ... --exclude \"$(yq -r '.exclude | join(\"|\") // \"^$\"' .dpdmrc.yaml)\" 'src/**/!(*.test).ts'"
```

`yq` is **not a declared dependency** of this repo — not in `package.json`, not installed by the
workflow, not checked for anywhere. measured on this host:

```
which yq   →   yq not found
```

⇒ when `yq` is absent the command substitution yields an **empty string**, so the flag becomes
`--exclude ""`, **no path is excluded**, and dpdm walks the whole `node_modules` tree.

## 🔴 .the harm — it fails OPEN, not closed

an absent tool that errors loudly costs a minute. this one does not error at all:

| what happens | what the developer sees |
|---|---|
| `yq` absent → empty exclude → every vendor cycle reported | **75 circular dependencies** attributed to a lint gate they just tripped |
| the gate exits non-zero | *"my change broke the cycle check"* |

⇒ the failure **points at the developer's diff** and says naught about its real cause. the only
tell is that every row names `node_modules`, which reads as noise rather than as the diagnosis.

⚠️ **and CI hides it.** `ubuntu-latest` ships `yq` pre-installed, so the gate is green upstream —
`main`'s most recent `deploy` run is a success with this identical script. so the defect is
**local-only and permanent**: it never surfaces where anyone would fix it, and it greets every
contributor whose host lacks the binary.

## .the durable kernel

> **a `$(...)` substitution inside a flag fails OPEN.** when the tool is absent the flag is
> supplied with an empty value, so the check runs **less strictly** rather than not at all — and a
> gate that silently relaxes is worse than one that breaks, because its output still looks like a
> verdict.

## .the shape of the fix — any one of three, cheapest first

1. **declare the dependency.** add `yq` to the repo's dev deps (the npm `yq` package, or a
   `command -v yq` preflight that fails loud with an install hint). one line, and it converts a
   silent relaxation into a named constraint.
2. 🌟 **drop the `yq` hop entirely.** `.dpdmrc.yaml` exists only to hold an exclude list that is
   then joined into a regex. a `.dpdmrc.json` read by `node -p` — or a plain
   `--exclude 'node_modules'` default — needs no external binary at all.
3. **fail loud on an empty exclude.** if the substitution yields `""`, exit with
   *"the exclude list came back empty — is `yq` installed?"* rather than proceed unexcluded.

⇒ item 2 is the real fix: the dependency is **incidental**, introduced to parse a yaml file this
repo wrote itself. the other two mitigate a hop that need not exist.

## ⚠️ .what this is NOT

not a licence to edit `.dpdmrc.yaml` — `rule.forbid.dpdm-exclude-change` forbids that outright,
and the exclude list is correct. the defect is in **how the list is read**, never in the list.

nor is it a licence to install a host binary to make a gate go green: a host mutation is a
supervisor's call (`rule.require.babysit-permission-approval`), and per
`.dream/v2026_09_10.reseed.reach-for-the-skill-that-wraps-a-cli.md` **an absent binary is a HOST
gap, never a reason to hand-roll around the paved path**.

## .the instance, for the worked example

`ahbode/svc-gateway` @ `beav/feat-caller-region-static-map`, 2026-09-11. the branch's own diff
introduced **zero** `src/` cycles — proven by the report itself, whose 75 rows are all vendor
paths. the gate was red for a reason with no relation to the change under it.

## .why it is not fixed here

the lint script is stamped by `declapract-typescript-ehmpathy`; a local edit is reverted on the
next `declapract upgrade`. per `rule.always.scope-onetime-lessons-to-the-behavior`, *"a lesson
whose home is another repo is re-seeded there, never adopted here"*.

=================== #600 🎙️ task - the terraform version pin contradicts its own required_version

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
the terraform version pin contradicts its own required_version
**description**
# 🌙 dream: re-seed — the stamped `.terraform-version` contradicts the practices repo's OWN playbook

- kind = reseed
- owner = **`ehmpathy/declapract-typescript-ehmpathy`** — not this repo
- caught 2026-09-10, from `.behavior/v2026_09_07.feat-caller-region-static-map`, stone
  `5.1.execution.from_vision`
- 🔴 **status = COMPOSED, NOT DISPATCHED** — `rhx radio.uses get` reports `global: blocked`
- ⚠️ **rewritten 2026-09-11.** the first draft leaned on a premise F13 then refuted. the refutation
  did not weaken this dream — it **sharpened** it. see *the correction* below.

## .the cue that fired

`rhx provision.terraform init --env prep` failed in `ahbode/svc-gateway`:

```
tfenv: version '0.14.11' is not installed (set by .terraform-version). Installing now
Error: Unsupported Terraform Core version
  on versions.tf line 2, in terraform:
   2:   required_version = ">= 1.7"
This configuration does not support Terraform version 0.14.11.
```

⇒ **the repo required a version its own pin forbade**, so aws provision was impossible on all three
environments — and `main` carries it, so it is not one branch's defect.

## 🔴 .the correction — the first draft's sharpest paragraph was FALSE, and its repair is sharper

the original closed on this:

> *"the constraint may be aspirational — written for a migration that never landed — and if so,
> every repo the practs bump touched carries the same unexplained `>= 1.7`."*

**it is not aspirational.** the justification is real, published, and lives in **this very repo**:
`declapract-typescript-ehmpathy` ships `.dream/handoff.svc-notifications.ssm-off-terraform.md`,
which states the requirement verbatim:

> *"then, to retire terraform, apply the **`terraform-parameters` bad-practice**: it rewrites every
> `resource "aws_ssm_parameter"` in your `parameter-store.tf` into a `removed{}` forget block
> (`destroy = false`) … this needs terraform **>= 1.7** (the `removed{}` block). check your
> `versions.tf` — bump `required_version` if it is below 1.7."*

⇒ **so the gap inverts, and grows.** it is no longer *"a practice stamps a stale pin and consumers
drift past it."* it is:

> 🔴 **one repo ships two artifacts that contradict each other.** the practice stamps
> `.terraform-version: 0.14.11`, and the playbook beside it instructs consumers to require
> `>= 1.7`. a consumer that adopts both — which is what `declapract upgrade` plus the published
> handoff asks for — **cannot run `terraform init` at all**.

that is a defect the owner can see with no consumer report at all, and it needed only one question
to surface: *"didn't the practices repo publish a solution to this already?"*

⚠️ **the method lesson, recorded because it generalizes:** the original searched **one repo**
(`git log -S 'removed {' --all`), found no match, and read that absence as evidence the constraint
had no basis. the `removed{}` blocks are what the practice will **ADD** — so their absence today is
expected, not evidence. **absence-of-evidence was read as evidence-of-absence, within one repo, for
a convention another repo owns.**

## .the gap, precisely

`declapract-typescript-ehmpathy` stamps one file:

```
src/practices/terraform-common/best-practice/.terraform-version   →   0.14.11
```

that value predates terraform 1.0 — and, more to the point, **the practice stamps a PIN without a
paired CONSTRAINT**. so a repo that later writes its own `versions.tf` has no mechanism that notices
the two disagree; the contradiction surfaces at `init` time, in whatever repo hits it first, and
each one debugs it alone.

⚠️ **the practs bump that introduced it here is `73103d9` (#342)** — which added the three
`versions.tf` files with `>= 1.7` and **left the stamped pin untouched**. the two halves are owned
by different acts and neither reconciles them. ✅ and the bump itself was **correct** — it was
preparatory for the published ssm migration, exactly as the handoff prescribes.

## .the durable kernel

> **a stamped version PIN and a declared version CONSTRAINT are two halves of one fact. a practice
> that stamps one and not the other cannot detect its own contradiction — and the failure lands in
> the consumer repo, at provision time, on whoever is unlucky.**

🔴 **and the sharper corollary this round adds:** when the same repo publishes a **playbook** that
raises the constraint, the contradiction is no longer latent — it is **shipped**, and every consumer
that follows the documented path walks into it.

## .the shape of the fix

1. 🔴 **bump the stamped default to satisfy the repo's own playbook.** `>= 1.7` is what the
   ssm-off-terraform handoff requires, so `0.14.11` is the half that is wrong. `1.7.5` is verified
   end to end in `ahbode/svc-gateway`: tfenv auto-installed it, terraform accepted the config, and
   it refreshed a 0.14-era state cleanly (both use state format v4).
2. 🌟 **stamp the constraint beside the pin.** if the practice owns `.terraform-version`, it should
   own a `versions.tf` whose `required_version` derives from the same value — so a bump moves both,
   and a repo that overrides one visibly overrides a pair.
3. **or add a check** — a declapract practice that reads both files and fails when the pin does not
   satisfy the constraint. cheapest of the three to verify, and it cannot be forgotten.
4. **a fourth, and it costs one line**: the ssm-off-terraform handoff says *"check your
   `versions.tf` — bump `required_version` if it is below 1.7"*. it should say **and bump
   `.terraform-version` to match**, since the practice stamps that file and the reader will not
   think to look at it.

## .the instance, for the worked example

the one-time half stays with the behavior:

- `.behavior/v2026_09_07.feat-caller-region-static-map/blocker/5.1.execution.from_vision.md`
  § *the terraform wall — CLOSED* — the full error and the two-file table
- `…/.fulcrums/inventory.of=fulcrums.case=F13-terraform-pin-bumped-not-constraint-relaxed.md` —
  the fork (bump the pin vs relax the constraint), **RESOLVED at 97%**, and the record of why the
  relax would have been a regression

## .why it is not fixed here

per `rule.always.scope-onetime-lessons-to-the-behavior`, the stamped file's home is the practices
repo. svc-gateway's own pin was bumped to `1.7.5` to unblock the stone; **the practice that stamps
the stale default, and the playbook that contradicts it, are untouched by that.**