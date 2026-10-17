# research — open issues before the window, batch c (#584 565 562 548 546 545 544 539 532 530 519 517)

read-only triage against the tree at `8c4c1fe` (v0.49.13). every cite is `file:line` as read on
2026-10-14. no commit message names any of these twelve (`git log --grep '#<n>'` empty for each);
D0 cites come from `git log -S`.

note: the tunnel object-form row is **#638** in the inventory (`1.vision.experience.case=_.md:101`),
not #652 (#652 is pg tls, `:115`).

## .summary

| # | short title | disposition | class / delivery / care | fulcrum |
|---|-------------|-------------|-------------------------|---------|
| 584 | gate jest-expo major on repo expo major | **D0** — b8d4803 (#605, v0.49.12) | — | 75%: jest 30 floor (tests-any) under jest-expo ≤53 left ungated; alt = gate jest major too |
| 565 | `X.contract` in published i/o | **D1-via-#634** (floor half D0 b8d4803) | B7 / C3 / alt | — (no template in tree carries `X.schema`) |
| 562 | tunnel object form (ghlitch 0.2.11) | **D1-via-#638** (duplicate of #539) | B1 / C2 / crit | — |
| 548 | joi→zod: `Joi.number()` / `Joi.date()` coercion | **D1** (date half D0 b8d4803 via the review marker) | B2 / C3 (extant fix fn) / crit | 65%: marker names `z.coerce.number()` too; alt = emit `z.coerce.*` |
| 546 | domain-objects ≥0.33 in the joi→zod wave | **D0** — b8d4803 (#605, v0.49.12) | — | — |
| 545 | single zod identity (tsc OOM) | **D1-via-#654 + #624**, residual **D1** | B1 / C2 / crit | 65%: emit `pnpm.overrides.zod` = sdk-aws-lambda's pin; alt = extend #654's exact direct pin to non-joi repos |
| 544 | migrate param paths explicit → bare | **D1-via-#637/#686** (prose) + residual **D1** (detect) + **D2** (migrate skill on ghlitch#129) | B3 / C3 / alt | 60%: check-only bad-practice keeps plan red until seeded; alt = readme only |
| 539 | tunnel strings + shallow-merge clobber | **D1-via-#638** (7a, 7c); 7b → #637 + #544 | B1 / C2 / crit | — |
| 532 | cut over to sdk-aws-lambda codegen | **D1** | B7 / C3 + readme / alt | 70%: detect hand clients by `askLambdaEndpoint` in `access/sdks/svc*`; alt = readme only |
| 530 | sql-schema-control `id:` → `exid:` | **D1** | B4 / C1 + C3 / alt | 85%: template moves to `exid:`; bad-practice globs `provision/schema/**/*.yml` |
| 519 | standardized `database.tunnel` shape | **D1-via-#638** | B1 / C2 / crit | 80%: fold a distinct-port assertion into #638's clamp |
| 517 | legacy `lib` override breaks ES2022 `cause` | **D1** | B1 / C3 / alt | 75%: fix appends `ES2023` to `lib`; alt = delete `lib` |

totals: D0 2 (#584, #546) · D1-via-#6xx 4 (#565, #562, #539, #519) · D1 6 (#548, #545 residual,
#544 residual, #532, #530, #517 — #545/#544 split) · D2 1 part (#544's migrate skill) · other-repo 0
whole issues.

---

## #584 — gate the jest-expo major on the repo's expo major

1. **report for this repo** — the tests-expo package.json gate.
2. **status: D0.** `src/practices/tests-expo/best-practice/package.json.declapract.ts:6-25` carries the
   gate and cites `#584 / defect D1` at `:14`. check `:91-97` requires jest-expo major == expo major;
   `:99-108` requires react-test-renderer major == react major; fix `:167-175` pins
   `jest-expo ^<expo>.0.0` and `react-test-renderer ^<react>.0.0`; a no-expo repo returns `:87-89`.
   `git log -S'#584' -- src/practices/tests-expo` → `b8d4803` (#605, released v0.49.12).
3. residual (not acted on): the issue also names the jest 30 / `.ts`-config bump. jest is floored at
   `30.2.0` in `tests-any/best-practice/package.json:5` (core usecase, so expo too). jest-expo 51 and 54
   both depend on `babel-jest ^29` / `jest-environment-jsdom ^29` (`npm view jest-expo@51.0.4` /
   `@54`), so the 54 baseline already runs jest 30 over a jest-29 jsdom env; the reported crash was
   the react-19 preset, which the gate removes. **fulcrum (75%)**: jest 30 under jest-expo 51 is
   unverified; alt = gate the jest / @types/jest major on expo ≥ 54 too. the reporter repo is
   app-protools-native, whose latest work S3 holds — a jest-major gate, if wanted, would ride that hold.
4. **disposition: D0** — close with a comment that cites b8d4803 / v0.49.12.

## #565 — `X.contract` (not `X.schema`) for dobjs in published i/o contracts

1. **report for this repo** — domain / handler practices.
2. **covered by #634** (`1.vision.experience.case=_.md:97`): `domain` bad-practices rewrite
   `X.schema` → `X.contract()` in published i/o and detect `.ref(by)` without `static <by>`. #634 is
   itself the report that #565's prose form (`X.contract.nullable()`) no longer compiles on
   domain-objects 0.34 (`refs/issues.622-652.md:1390-1422`).
   - floor half: `domain/best-practice/package.json:3` = `minVersion('0.34.0')` (≥ the asked 0.33.0),
     landed in b8d4803.
   - template half: none owed — `rhx grepsafe '[A-Z][A-Za-z]+\.(schema|contract)\b'` over
     `src/practices/**/*.ts` returns 0 matches, so no best-practice example carries `X.schema`.
3. —
4. **disposition: D1-via-#634** — close with #634's commit; the #634 fix should edit #565's body to
   the paren form (per `refs/research.rds.md:33`).

## #562 — conform tunnel config to object form to match ghlitch 0.2.11

1. **report for this repo** — persist-with-rds config templates.
2. **covered by #638** (`case=_.md:101`) and a **duplicate of #539** (same target shape, different
   author; #638's body says so, `refs/issues.622-652.md:823`). current tree still ships strings:
   `persist-with-rds/best-practice/config/prep.json:24-25`, `prod.json:24-25`, `test.json:24-25`,
   while its own schema wants objects: `persist-with-rds/best-practice/src/utils/config/config.schema.ts:75-76`
   (`bastion: z.object({ exid })`, `cluster: z.object({ name })`). the issue's `Config.ts` target is
   moot: no `Config.ts` ships (the type is inferred, `config.schema.ts:108-110`), and #661 deletes
   hand-written ones.
3. —
4. **disposition: D1-via-#638.**

## #548 — joi→zod must emit coercion (joi coerces, zod does not)

1. **report for this repo** — runtime-schemas joi bad-practice fix fn.
2. **status: partly D0, residual open.** the issue offers *emit coercion OR document it*. the fixer
   still maps one-to-one: `runtime-schemas/bad-practices/joi/src/**/*.ts.declapract.ts:64`
   (`Joi.number` → `z.number`) and `:67` (`Joi.date` → `z.date`). the `@declapract:review` marker
   (`:25-35`, added under #594 in b8d4803) documents the **date** half (`:31-32`) and is silent on
   **number** (`NUMERIC` arrives from postgres as a string). not covered by any #6xx row (#629 is joi
   `.uuid()`; #654 is the zod dep).
3. **open:**
   - class **B2** (fix-breaks: the rewrite turns a db-hydrated dobj into a runtime throw once
     domain-objects ≥0.33 validates — which the 0.34.0 floor now guarantees);
   - delivery **C3** (edit of the extant joi bad-practice fix fn);
   - care **crit** — validation is live on every repo that takes the domain floor;
   - fix sketch: add a fourth marker bullet — `Joi.number()` coerced numeric strings; `z.number()`
     rejects them; use `z.coerce.number()` where input arrives as a string (postgres `NUMERIC`,
     query params). update the marker snapshot + idempotency test (`fix(fix(x)) === fix(x)`).
   - **fulcrum (65%)**: marker over blanket emit. a blanket `z.coerce.date()` / `z.coerce.number()`
     would silently accept `null → 1970-01-01` / `'' → 0` on api inputs — the same silent guess
     #594 rejected. alt = emit `z.coerce.*` only inside files under `src/domain.objects/`
     (db-hydrated), marker elsewhere.
4. **disposition: D1.**

## #546 — bump domain-objects to ≥0.33.0 in the joi→zod wave

1. **report for this repo** — domain floor.
2. **status: D0.** `domain/best-practice/package.json:3` = `check.minVersion('0.34.0')`;
   `git show b8d4803 -- src/practices/domain/best-practice/package.json` shows `0.31.13 → 0.34.0`
   (#605, v0.49.12). `domain` sits in `typescript-project-core` (`src/useCases.yml:22`), which
   `lambda-service` extends (`:51-53`) — the only usecase that carries `runtime-schemas` (`:64`) — so
   any repo the joi fixer touches takes the floor in the same apply. `npm view domain-objects version`
   = 0.34.0 (published).
3. the asked fault-injection probe is an adopter-side proof (it needs the adopter's own dobjs); no
   practice clamp is owed beyond the floor.
4. **disposition: D0** — close with a comment that cites b8d4803 / v0.49.12.

## #545 — emit one zod identity before untyped `genLambdaEndpoint` handlers (tsc OOM)

1. **report for this repo** — node-service / runtime-schemas package.json.
2. **status: mostly covered, residual open.**
   - #654 (`case=_.md:117`): the joi fixer adds `zod` **4.4.3 exact** = sdk-aws-lambda's pin, so a
     repo migrated through joi holds one identity for the handler / sdk pair.
   - #624 (`:87`): runtime-schemas floor → 4.0.0 and `override-undercuts-dependency`, so an extant
     `pnpm.overrides.zod` can no longer hold zod below the floor.
   - gap: a repo already on zod (never through the joi fixer) keeps whatever 4.x it has. today the
     joi fixer adds `^3.24.0` (`runtime-schemas/bad-practices/joi/package.json.declapract.ts:13`) and
     floors are minima only (`runtime-schemas/best-practice/package.json:3`, `config/best-practice/package.json:5`),
     so e.g. direct zod 4.6.7 (latest, `npm view zod version`) beside `sdk-aws-lambda@0.7.1`'s exact
     `zod: '4.4.3'` (`npm view sdk-aws-lambda@0.7.1 dependencies`) leaves two `ZodType` graphs — the
     OOM cause the issue bisected. (`sdk-config@0.3.0` pins `zod: '4.3.6'` exact too.)
3. **open (residual):**
   - class **B1** (the emitted tree fails `tsc`); delivery **C2** (package.json merge fix); care **crit**;
   - fix sketch: in `node-service/best-practice/package.json.declapract.ts` (or a runtime-schemas
     fix), when `sdk-aws-lambda` is a dep, merge `pnpm.overrides.zod = '4.4.3'` (the version
     sdk-aws-lambda at the practice floor pins; read it from one constant shared with #654) and keep
     every other `pnpm.*` key; #624's undercut check then holds it at or above the floor. clamp:
     fixture with direct zod 4.6.7 + sdk-aws-lambda 0.7.1 → one override; second apply no diff.
   - **fulcrum (65%)**: override over direct pin. alt = extend #654's exact direct pin to every repo
     with sdk-aws-lambda (no override; leaves sdk-config's 4.3.6 copy, harmless to handler inference).
     an override must be re-raised on every sdk-aws-lambda zod bump; a stale override is what #624
     flags.
4. **disposition: D1-via-#654/#624, residual D1** (lands with #654, one constant).

## #544 — auto-migrate config param paths to the sdk-config derived convention

1. **report for this repo** (detect + document) **and other-repo / impossible** parts (the live ssm
   move; declapract has no aws access).
2. **status: split.**
   - covered: #637 (`case=_.md:100`) ships the derived param names, sdk-config floor 0.3.0, and a
     readme + marker that names the copy step; #686 (`:147`) puts the admin→cicd / service→crud copy
     in `provision/aws/readme.md` as a human step against #637's names; #638
     (`refs/research.rds.md:18`) lets an extant explicit `$.at(aws::param/…)` satisfy the declared
     bare one, so the best-practice check stays green mid-migration.
   - not covered (comment of 2026-09-25): (a) a bad-practice that **detects** an explicit path, since
     `old-param-placeholder` only matches `__PARAM__`
     (`persist-with-rds/bad-practices/old-param-placeholder/config/*.json.declapract.ts:4`) and its
     fix writes bare with no seed note (`:12`; no `.declapract.readme.md` in that dir); (b) the
     `aws.ssm.param.migrate` skill, which wraps `aws.ssm.param.set` — in no ghlitch release
     (ghlitch#129 OPEN; `npm view rhachet-roles-ghlitch version` = 0.3.0).
3. **open (residual a):**
   - class **B3** (plan reads a mid-migration repo as conformant); delivery **C3**; care **alt**;
   - fix sketch: `persist-with-rds/bad-practices/unmigrated-param-paths/config/{prep,prod}.json.declapract.ts`
     — check returns on `$.at(aws::param/`; **no auto-flip** (fix leaves contents, so plan stays red,
     per the `environments/bad-practices/old-stage-enum` precedent); `.declapract.readme.md` names the
     order seed-then-flip and #686's readme step; add a `.declapract.readme.md` to
     `old-param-placeholder` that names the same seed step. clamp: explicit path detected, bare not.
   - **fulcrum (60%)**: a check-only bad-practice reds every un-migrated adopter (~22 svc-* repos)
     until a human seeds aws. alt = readme + #637 marker only, no detection.
4. **disposition: D1-via-#637/#686 (prose) + D1 (residual a) + D2 (residual b — waits on
   rhachet-roles-ghlitch#129 to publish `aws.ssm.param.set`; then a best-practice skill pinned to that
   ghlitch floor).** the hold comment names ghlitch#129.

## #539 — config template regresses tunnel bastion/cluster to strings

1. **report for this repo** — persist-with-rds config templates + their fix fns.
2. **covered by #638** (`case=_.md:101`, `refs/research.rds.md:16-21`), which absorbs both residual
   rows in the issue's own update:
   - 7a: strings at `config/prep.json:24-25`, `prod.json:24-25` vs schema objects
     `config.schema.ts:75-76` → objects; cluster name derived from the host.
   - 7c: `test.json:24-25` carries the strings too, and every `{env}.json.declapract.ts` fix is a
     shallow spread (`prep.json.declapract.ts:9-13`, same in prod/test) whose template `database`
     replaces the repo's whole subtree → #638 drops bastion/cluster from `test.json` and deep-merges.
   - the asked regression clamp = #638's `config-validates-schema` integration test.
   - 7b was moved by the reporter to #544; the derived form is #637.
3. —
4. **disposition: D1-via-#638** (7b via #637 + #544).

## #532 — cut over to sdk-aws-lambda codegen instead of ad-hoc clients

1. **report for this repo** — node-service / directory-structure-src.
2. **status: open.** no practice names the codegen or `access/svcs` (`rhx grepsafe
   'sdk-aws-lambda gen|access/svcs'` → 0 hits in `src/practices`). the only svc-client path is
   `directory-structure-src/bad-practices/data-dir/src/**/data/**/*.declapract.ts:8`, which moves
   `data/clients/*` to `access/sdks/*` — a svc client lands under `sdks`, not `svcs`. #650 / #666
   retire the old lambda test-methods package (test callers), #646 rewrites handlers; none touches a
   cross-service client. the codegen is published: `sdk-aws-lambda@0.7.1` bin `sdk-aws-lambda` →
   `dist/contract/cli/gen.js`.
3. **open:**
   - class **B7**; delivery **C3** + node-service readme; care **alt**;
   - fix sketch: `node-service/bad-practices/hand-written-svc-client/src/access/sdks/svc*.ts.declapract.ts`
     — detect a hand client (imports `askLambdaEndpoint` / `invokeLambdaFunction` and holds no
     "generated — do not edit" banner); fix stamps a `@declapract:review` marker that names
     `npx sdk-aws-lambda gen --for <svc> --into src/access/svcs/ --env prep` (the fix cannot run it:
     introspection needs prep creds). node-service readme documents `access/svcs/` as the generated
     home. clamp: detect / skip-generated / marker idempotent.
   - **fulcrum (70%)**: detection keyed on `askLambdaEndpoint` under `access/sdks/svc*`; alt = readme
     only, no detection. second call (60%): `data-dir` keeps its route of `data/clients/svc*` to `sdks`.
4. **disposition: D1.**

## #530 — auto-migrate sql-schema-control `id:` → `exid:`

1. **report for this repo** — persist-with-rds schema template + a new bad-practice.
2. **status: open.** the template itself ships the legacy key:
   `persist-with-rds/best-practice/provision/schema/sql/init.yml:2,7` (`id: init_default_txn_isolation`,
   `id: init_service_user`), checked `FileCheckType.CONTAINS` (`init.yml.declapract.ts:3`) — so a
   consumer that renames to `exid:` fails CONTAINS and plan reds forever (no fix fn). floor already
   supports `exid`: `persist-with-rds/best-practice/package.json:9` = `minVersion('1.8.1')`
   (`npm view sql-schema-control version` = 1.8.1). no other `id:` in any practice yml (grepsafe
   `^\s*id:` → only those two lines). not in any #6xx row.
3. **open:**
   - class **B4** (template and the tool's preferred key fight; every plan/apply warns); delivery
     **C1** (`init.yml` → `exid:`) **+ C3** (`persist-with-rds/bad-practices/legacy-change-id/provision/schema/**/*.yml.declapract.ts`:
     check returns when a `- type: change` entry carries `id:`; fix renames `id:` → `exid:` on change
     entries only, never adds beside a kept `id`, leaves an `exid` entry alone); care **alt**;
   - the glob covers nested definitions (`provision/schema/sql/init.yml`, the svc-chat case), not only
     `control.yml`. clamp: rename, both-keys guard, nested file, `fix(fix(x)) === fix(x)`,
     and an executeApply that converges a legacy repo in one apply.
   - **fulcrum (85%)**: rename via a yaml `Document` edit scoped to change entries over a line regex.
4. **disposition: D1.**

## #519 — declare a standardized `database.tunnel` best-practice shape

1. **report for this repo** — persist-with-rds config (the issue says "config", but the tunnel lives
   in persist-with-rds, the only practice with a database).
2. **covered by #638.** the shape is already declared in the schema:
   `persist-with-rds/best-practice/src/utils/config/config.schema.ts:74-87` (bastion `{exid}`, cluster
   `{name}`, local `{host, port}`, lambda nullable) and `aws.account` at `:45-48`; per-env distinct
   ports are in the templates (`prep.json:28` = 15432, `prod.json:28` = 15433, `test.json:27-28` =
   `localhost` / 7821). what is broken is that the templates ship strings for bastion/cluster
   (`prep.json:24-25`) — #638's fix.
3. **fulcrum (80%)**: fold one assertion into #638's `config-validates-schema` clamp — prep and prod
   `tunnel.local.port` differ, test `tunnel.local.host === 'localhost'`. alt = no port clamp.
4. **disposition: D1-via-#638.**

## #517 — legacy tsconfig `lib` override breaks the ES2022 `cause` template

1. **report for this repo** — typescript-node tsconfig.
2. **status: open.** `typescript-node/best-practice/tsconfig.json:2-5` extends
   `@tsconfig/node20` with no `lib`, checked `CONTAINS` (`tsconfig.json.declapract.ts:3`), so an extra
   `"lib": ["DOM"]` passes the check yet replaces the es2023 lib. the template that needs ES2022
   `ErrorOptions` now sits at `tests-node/best-practice/jest.integration.env.db.ts:87`
   (`{ cause: error }`). no #6xx row (#632 narrows the caught value; it does not touch `lib`).
3. **open:**
   - class **B1** (a shipped template fails `tsc` in a repo with a common legacy override); delivery
     **C3** (`typescript-node/bad-practices/lib-below-es2022/tsconfig.json.declapract.ts`); care **alt**;
   - fix sketch: check returns when `compilerOptions.lib` is set and holds no `es2022+` / `esnext`
     entry; fix appends `"ES2023"` (keeps the adopter's `DOM`). the file is jsonc (comments
     `tsconfig.json:14-16`, an end-of-list comma `:33`) → parse/edit with a jsonc tool, never
     `JSON.parse`. clamp: `["DOM"]` → `["DOM","ES2023"]`; second apply no diff; absent `lib` untouched.
   - **fulcrum (75%)**: append `ES2023` over delete `lib` (delete would also drop `DOM` types an
     adopter may use). alt = delete the key.
4. **disposition: D1.**
