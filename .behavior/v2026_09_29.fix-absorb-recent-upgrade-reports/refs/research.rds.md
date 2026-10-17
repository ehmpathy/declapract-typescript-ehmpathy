# research — persist-with-rds / schemas cluster (#613, #652, #638, #637, #634, #625, #624, #629)

headline: #613 already fixed (close it). #637 has an out-of-org infra precondition (ahbode IAM). #652 needs sql-schema-control ssl for migrations once force_ssl flips (not today). #637 + #638 + #630 touch one `config/*.json.declapract.ts` check/fix pair → one design.

## #613 — jsdoc closes itself
- fixed by d372808 (PR #614, "refs #613"), shipped v0.49.13; clamp `src/bestPracticeTemplateParse.declapract.integration.test.ts`; rule `rule.forbid.template-comment-self-close.md`. issue still OPEN.
- fix: close with a comment that cites d372808 / v0.49.13.

## #652 — pg client ssl verify-full
- now: `persist-with-rds/best-practice/src/utils/database/getOneDatabaseConnection.ts:63-69` → `new Client({host,port,user,password,database})`, no `ssl`. `test.json:30` `lambda: null`.
- fix: new EQUALS files `src/utils/database/rdsCaBundleUsEast1.ts`, `asDatabaseClientSsl.ts`, `asDatabaseClientSsl.test.ts`; `getOneDatabaseConnection.ts` adds `ssl: asDatabaseClientSsl({ clusterEndpoint: config.database.tunnel.lambda?.host ?? null })`; bad-practice `persist-with-rds/bad-practices/pg-client-without-ssl/src/utils/database/*.ts.declapract.ts` (detect `new Client({` w/o `ssl:`; fix adds import + `ssl:` after `database:`).
- decision: us-east-1 bundle; region parsed from `*.<region>.rds.amazonaws.com`, ConstraintError otherwise (65%). null endpoint (testdb) → plain.
- cross-repo: sql-schema-control `connectToDatabase.ts:46-52` has no ssl — add optional `ssl` to `ConnectionConfig`; template `connection.config.js` then passes it. not a blocker while clusters run `force_ssl = 0`. same audit for ghlitch `aws.postgres.query`.
- clamp: unit 4 cases (null → plain; CA + rejectUnauthorized; tunnel alias passes; impostor cert rejected); executeApply scoped `file:` with snapshots; bad-practice fix(fix(x)) === fix(x).

## #638 — tunnel bastion/cluster value + config/schema clamp (+ #539 7a/7c, #562)
- now: `config/{test,prep,prod}.json:24-25` strings (`"bastion": "vpc-main-bastion"`, `"cluster": "@declapract{variable.databaseName}"`) vs `config.schema.ts:75-76` objects `bastion: {exid}`, `cluster: {name}` (optional). fix `{env}.json.declapract.ts:9-13` shallow merge (template `database` replaces repo's). no test parses config JSON against schema.
- fix: prep/prod → `{ "exid": "vpc-main-bastion" }`, `{ "name": … }`; drop both from `test.json`; cluster name via `contents` fn: `context.projectVariables.databaseClusterName ?? firstLabel(databaseClusterHost.<env>)`; deep merge (keeps repo extras; check + fix agree; an extant explicit `$.at(aws::param/…)` satisfies a declared bare `$.at(aws::param)`).
- decision: derive, optional override variable — never a required new variable (would throw `Variable … was not defined` for every adopter) (80%).
- cross-repo: satisfied (ghlitch `use.vpc.tunnel.sh:229` reads `.cluster.name`).
- clamp: new `persist-with-rds/config-validates-schema.declapract.integration.test.ts` (per env, substitute vars + merge config practice's `config/<env>.json`, `schema.apply.safeParse` ok); value clamp `awesomesdb.cluster-…` → `cluster.name === 'awesomesdb'`; apply on a hand-patched repo keeps extras; twice-apply no diff.

## #637 — derived ssm param form half-shipped
- now: config ships bare `$.at(aws::param)` (`config/*.json:11,15,20`); `resources.parameters.ts:92-104` declares dotted `{org}.{project}.{slug}.database.role.crud.password` (slug `dev` for prep) and slash `/{org}/{project}/database/role/cicd/for-{plan,apply}/password`; tier from `access` (`:30`,`:42`). config floor `sdk-config@0.2.3`; derive `/{org}/{repo}/{choice}/{keyPath}` only in 0.3.0 (on npm).
- fix: issue diff — `choice = config`, `namespace = /{org}/{project}/${choice}`, three `${namespace}/database.role.….password`; `sdk-config` floor 0.3.0; readme `:42-44`; rewrite the #591 clamp (`ssm-cicd-param-names…`) to the derived form (#591 superseded); rework `src/stageAccessBridge.declapract.integration.test.ts:93` accessSlug leg; fix `empty-template-declares-zero-clusters…:44`.
- decision: ship derived form (65%) — config half already shipped; reversal restores the `dev` slug.
- cross-repo (outside ehmpathy): ahbode prod plan/apply roles need additive IAM `arn:aws:ssm:*:*:parameter/*/svc-*/*/database.role.cicd.for-{plan,apply}.password`; every adopter copies params to derived names (`rhx aws.ssm.param.set --from … --into …`) before next provision apply. order constraint: merge after the IAM pattern is live.
- clamp: rewritten #591 clamp + snapshot; `getAllParameters({ choice: 'prod' })` under `ACCESS=prep` → config wins.
- risk: high — renames every adopter's managed params; readme + plan-time migration note.

## #634 — #565 X.contract practice
- now: no #565 code; `domain` floor `domain-objects@0.34.0` (= latest). #565 body shows old `HomeService.contract.nullable()`.
- fix: bad-practice on `src/contract/**/*.ts`: `PascalCase.schema` inside `schema: { input|output }` → `PascalCase.contract()` (never `.ref()`; `getKeysOrThrow` only from `getContractRef.ts:202`); second bad-practice: `.contract().ref('primary'|'unique')` where the dobj file lacks `static <by>` → insert `public static primary = ['uuid'] as const;` when interface has `uuid`, else review marker. edit #565 body to paren form.
- decision: `.contract()` only (80%). home `domain` (vs node-service) — best guess.
- clamp: `X.schema.nullable()` → `X.contract().nullable()`, typechecks, second fix no-op; `.ref('primary')` w/o static detected, fixed.

## #625 — cache family floor
- now: `cache/best-practice/package.json:3-5` floors simple-in-memory-cache 0.5.1, simple-on-disk-cache 1.8.1, with-simple-cache 0.17.3 (all `.ifInstalled()`). absent: `with-domain-driven-cache` (1.1.5; old name `with-domain-driven-caching` 1.1.4), whose main pins `with-simple-cache ^0.15.1`. legacy `with-simple-caching`, `with-remote-state-caching` unfloored.
- fix: floors for both domain-driven names (`.ifInstalled()`); bad-practice `cache/bad-practices/unfloored-cache-member/package.json.declapract.ts` — any dep that fits `/^(with-[a-z-]+-cach(e|ing)|simple-[a-z-]+-cache)$/` outside the floored set flagged; fix maps renamed legacy names to successors, else flag; repo test: floored set == known set.
- decision: both halves (75%).
- cross-repo: `with-domain-driven-cache` release on `with-simple-cache ^0.17.3` (ehmpathy) — until then two copies.

## #624 — zod minVersion vs pnpm.overrides
- now: config zod 4.0.0, runtime-schemas 3.24.0 (both CONTAINS); check reads only `dependencies.zod` (`checkContainsJSON.js:55-58`); joi fixer `runtime-schemas/bad-practices/joi/package.json.declapract.ts:13` adds `zod: '^3.24.0'`.
- fix: runtime-schemas → 4.0.0 (both only in lambda-service, free); joi fixer adds `4.0.0`; new `pnpm/bad-practices/override-undercuts-dependency/package.json.declapract.ts` — `pnpm.overrides[x]` below the dep version → raise to dep version.
- decision: bad-practice, not a declarative overrides key (75%) — declapract 0.13.26 writes a literal `@declapract{…}` when parent `pnpm` absent (`checkContainsJSON.js:47-50,94-97`, `fixContainsJSON…:85-90`).
- clamp: svc-chat case (dep 4.0.0, override 3.23.8) detected → fixed to 4.0.0 → check throws; equal override not detected; fix(fix(x)) === fix(x).

## #629 — joi .uuid() → z.guid()
- now: joi fixer (`runtime-schemas/bad-practices/joi/src/**/*.ts.declapract.ts:62-70`) emits `z.string().uuid()` — strict RFC under zod 4; marker (`:25-35`) omits it.
- fix: after the `Joi.string` rewrite: `z.string().uuid()`/`.guid()` → `z.guid()`; `uuidv4` version option → `z.uuidv4()`; other versions → `z.uuid()`; marker bullet 4; backfill only in files that still carry `@declapract:review`: `z.uuid()`/`z.string().uuid()` → `z.guid()`.
- decision: `z.guid()` (90%); marker-scoped backfill (65%).
- clamp: `Joi.string().uuid().required()` → `z.guid()`; runtime assert `'beefbeef-beef-beef-beef-beefbeefbeef'` passes; uuidv4 case; snapshot; idempotent.
