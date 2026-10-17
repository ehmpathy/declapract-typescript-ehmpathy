=================== #652 🎙️ task - feat(persist-with-rds): connect with ssl verify-full wherever a cluster endpoint is declared

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
feat(persist-with-rds): connect with ssl verify-full wherever a cluster endpoint is declared
**description**
# persist-with-rds: connect with ssl verify-full wherever a cluster endpoint is declared

## .what

`persist-with-rds/best-practice/src/utils/database/getOneDatabaseConnection.ts` opens a `pg.Client`
with no `ssl` option.

- every service that adopts it connects **plain**
- aurora-postgresql 15+ default parameter groups set `rds.force_ssl = 1`
  - measured: the default group for 17 sets it to 1
  - ⇒ a plain client is refused with `no pg_hba.conf entry ... no encryption` the moment a cluster
    moves onto such a group

the practice should ship an ssl-ready client, so the fleet can flip `force_ssl` on with no
per-service change.

## .why now

- the prep cluster upgrade to 17 silently turned `force_ssl` on; svc-chat's lambdas and acceptance
  suite were refused immediately
- there are too many services to upgrade in one step, so the clusters are set to `force_ssl = 0`
  (custom parameter group) for the upgrade
- ⇒ `force_ssl = 0` still admits encrypted clients, since the choice is made per client. every service
  that adopts this practice becomes future-compatible, and the flag can be flipped on once the fleet has
  adopted it

## .the shape — proven in ahbode/svc-chat

three files, plus a one-line change at each `new Client(...)`:

| file | what |
|---|---|
| `src/utils/database/rdsCaBundleUsEast1.ts` | the rds us-east-1 ca bundle (rsa2048 g1, rsa4096 g1, ecc384 g1) as a ts constant, so the lambda bundle carries it — source: `https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem` |
| `src/utils/database/asDatabaseClientSsl.ts` | transformer: `{ clusterEndpoint: string \| null } → tls.ConnectionOptions \| false` |
| `src/utils/database/asDatabaseClientSsl.test.ts` | 4 unit cases: null → plain · ca + rejectUnauthorized set · tunnel alias passes · impostor cert rejected |

```ts
import { checkServerIdentity, type ConnectionOptions } from 'node:tls';

import { RDS_CA_BUNDLE_US_EAST_1 } from './rdsCaBundleUsEast1';

export const asDatabaseClientSsl = (input: {
  clusterEndpoint: string | null;
}): ConnectionOptions | false => {
  // plain where no cluster endpoint is declared — the local testdb
  if (!input.clusterEndpoint) return false;

  // verify the chain against the rds roots, and the name against the cluster endpoint
  const clusterEndpoint = input.clusterEndpoint;
  return {
    ca: RDS_CA_BUNDLE_US_EAST_1,
    rejectUnauthorized: true,
    checkServerIdentity: (_hostDialed, cert) =>
      checkServerIdentity(clusterEndpoint, cert),
  };
};
```

at the client:

```ts
const client = new Client({
  // ...host, port, user, password, database as today
  ssl: asDatabaseClientSsl({
    clusterEndpoint: config.database.tunnel.lambda?.host ?? null,
  }),
});
```

## .the two traps the shape avoids

- **`require` is not enough.** encrypt-only accepts any certificate, so a man in the middle reads
  every password and row. verify-full checks both the chain and the name
- **`servername` cannot pin the name under pg@8.** `lib/connection.js` sets
  `options.servername = host` after it merges the caller's `ssl`, so a local tunnel that dials an
  alias (`aws.ssmproxy.ahbodedb.prep`) fails the name check against the cluster cert.
  `checkServerIdentity` bound to the cluster endpoint is what survives that override

## .the key the transformer reads

`database.tunnel.lambda.host` is the cluster endpoint in prep and prod; `test.json` sets
`lambda: null`, which marks the local testdb. so the rule the practice encodes is:

> **a declared cluster endpoint means verify-full against it; no endpoint means the testdb, plain.**

no new config key is required.

## .proof

- unit: 4 of 4 pass
- integration: `getDatabaseConnection.integration.test.ts` 3 of 3 on the local testdb (plain)
- live: deployed svc-chat to prep while its cluster still enforced `force_ssl = 1` on 17; a cache-miss
  `getThreadByUuid` ran `sqlQueryFindChatThreadByUuid` and returned a result — a real round trip over
  verified tls

## .asks

1. add the ssl transformer, the ca constant, and its test to `persist-with-rds/best-practice`
2. wire `ssl:` into the practice's `getOneDatabaseConnection.ts` (and `getDatabaseConnection.ts` where
   a repo carries the readonly variant)
3. a `bad-practices/` check that flags a `new Client({...})` in `src/utils/database/` with no `ssl:`
4. note the ca bundle's region: other regions need their own bundle, or the global bundle

=================== #651 🎙️ task - fix(acceptance): cloud acceptance run against prep hangs; jest env sources keyrack env test for every target

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(acceptance): cloud acceptance run against prep hangs; jest env sources keyrack env test for every target
**description**
## .what

a cloud acceptance run against prep hangs: every lambda invoke hits the 90s jest timeout, with no error. the same lambda invoked directly (aws cli, prep profile) returns in under a second.

```
rhx git.repo.test --what acceptance --against cloud --env prep --mode apply --scope getServiceBySlug
→ thrown: "Exceeded timeout of 90000 ms for a test." (x3, then useThen: tried to access value before test ran)
```

## .suspects — root cause NOT yet confirmed

1. `jest.acceptance.env.ts` (template) always runs `keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'lenient' })`, whatever env the run targets. on a prep run this can overlay test-env keys (e.g. `AWS_PROFILE`) on the prep creds that `git.repo.test --env prep` already sourced. the env should come from the run (e.g. `process.env.ACCESS`), not a literal `'test'`
2. `git.repo.test` (rhachet-roles-ehmpathy) unlocks + sources keyrack for `--env`, but does not export `ACCESS=$env`, so `sdk-environment` inside the jest process may derive the wrong stage for `invokeLambdaForTesting`

## .ask

diagnose which one (or both) causes the hang, then fix at the template. one repro command above; logs sit under `.log/role=mechanic/skill=git.repo.test/what=acceptance/` in ahbode/svc-home-services, branch `beav/fix-register-air-duct-and-dryer-vent-cleaning`.

## .clamp owed

an acceptance run against a non-test env whose keyrack differs from test: red today, green after.

=================== #650 🎙️ task - fix(tests-service): the practice mandates simple-lambda-testing-methods, an aws-sdk v2 caller that cannot read an sso profile

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(tests-service): the practice mandates simple-lambda-testing-methods, an aws-sdk v2 caller that cannot read an sso profile
**description**
# fix(tests-service): the practice mandates `simple-lambda-testing-methods`, an aws-sdk v2 caller that cannot read an sso profile

## .what

`src/practices/tests-service/best-practice/package.json` requires
`"simple-lambda-testing-methods": "@declapract{check.minVersion('0.5.1')}"`, and the
`blackbox/lambdas/*.acceptance.test.ts` best-practice emits `import { invokeLambdaForTesting } from
'simple-lambda-testing-methods'`.

that package reaches aws through `simple-lambda-client` → **aws-sdk v2**. v2 has no sso-profile
support, so it falls through to IMDS and hangs, or auths against no reachable target. the practice's
own `tests-node/best-practice/src/.test/useKeyrack.ts` carries two comments that exist only to work
around it (lines 33, 87: static creds export, `AWS_PROFILE` drop).

## .the failure it causes

- a repo that follows the practice gets a blackbox caller that cannot use the org's sso auth
- a repo that already moved off it (to `sdk-aws-lambda`'s `runLambdaEndpoint`, which is on
  `@aws-sdk/client-lambda` v3 and reads an sso profile natively) is re-flagged on the next upgrade:
  `check.minVersion('0.5.1')` demands the removed package back

measured on `ahbode/svc-notifications`: 29 files moved to `runLambdaEndpoint.onReferenced` /
`.onSerialized` + `asLambdaEvent.from*`; integration 103/0/1, acceptance local 18/0/4, cloud-prep
20/0/2, all under a plain sso profile.

## .the ask

1. `tests-service/best-practice/package.json` — drop `simple-lambda-testing-methods`; the caller is
   `sdk-aws-lambda` (already required by node-service at #646's floor)
2. `tests-service/best-practice/blackbox/lambdas/*.acceptance.test.ts` — emit
   `runLambdaEndpoint.onSerialized({ which, event, at }, context)` with `asLambdaEvent.from*`
3. a bad-practice that rewrites `invokeLambdaForTesting` → `runLambdaEndpoint.onSerialized`,
   `invokeHandlerForTesting` → `runLambdaEndpoint.onReferenced`, `createExampleAPIGatewayEvent` →
   `asLambdaEvent.fromApiGateway`
4. once no caller is v2, retire the v2 workarounds in `tests-node`'s `useKeyrack.ts`

## .two traps a fixer must carry

- **the stance inverts across the two boundaries.** `onReferenced` RETURNS a caller fault as an
  envelope; `onSerialized` THROWS it. a mechanical swap of `getError(...)` assertions is wrong on one
  side or the other
- **apiGateway calls need `struct: { payload: 'ancient' }`** until `sdk-aws-lambda#51` lands; the
  default `contemp` frame 500s every apiGateway invoke

## .related, not duplicated

- `#646` — adopts sdk-aws-lambda 0.7 in the node-service **handlers**; silent on the tests-service caller
- `#586` — the useKeyrack v2 workaround this ask would let retire

## .origin

`ahbode/svc-notifications`, declapract upgrade route `v2026_07_28.declapract.upgrade`, stone 3.1
defect 13, classified at stone 3.2.

=================== #649 🎙️ task - fix(lint): set noFocusedTests to error — a stray .only passes lint and silently skips its siblings

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(lint): set noFocusedTests to error — a stray .only passes lint and silently skips its siblings
**description**
# fix(lint): set `noFocusedTests` to error — a stray `.only` passes lint and silently skips its siblings

**target** — `ehmpathy/declapract-typescript-ehmpathy`, `practices/lint/best-practice/biome.jsonc`
**raised** — 2026-09-28, from `ahbode/svc-notifications` branch `beav/feat-declapract-upgrade`

## .what

biome's `recommended` set includes `lint/suspicious/noFocusedTests`, but at **warn**. a warn does not
fail `test:lint`, so an `it.only` / `describe.only` merges clean — and every sibling test in that
file then reports as **skipped**, not failed. the suite stays green while it verifies less.

## .the case, measured

`src/domain.operations/phone/voice/consumeTwilioVoiceGatherReceivedEvent.integration.test.ts:165`
carried an `it.only`. it arrived in the prior declapract upgrade (`ahbode/svc-notifications#214`) and
survived every lint run since.

- the integration tier read `100 passed, 0 failed, 3 skipped`. two of those three skips were this
  `.only` — the authorized-forward and unauthorized-block cases, silently off since #214
- with the `.only` removed: `3 passed, 0 failed, 0 skipped` on that file

## .the shape of the fix

```jsonc
"suspicious": {
  // ...
  "noFocusedTests": "error"
}
```

## .the clamp, proven

with the rule at `error`, restore the `.only` and run `test:lint` → red at
`lint/suspicious/noFocusedTests`, line 165. remove it → green. measured both directions.

## .why upstream

`biome.jsonc` is declapract-declared. the local edit is overwritten on the next upgrade unless the
template carries it.

=================== #648 🎙️ task - fix(provision): condense and de-accrete the prose in the provision templates

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(provision): condense and de-accrete the prose in the provision templates
**description**
## the provision templates ship prose that states each fact several times, and some of it is false

adopters cannot trim it. with no `.declapract.ts` check beside them, these files are compared byte for
byte. a local cut turns `declapract plan` red, and the next `apply` puts the text back. ⇒ the repair
has to land here.

### the three files measured

| file | lines | what bloats it |
|---|---|---|
| `persist-with-rds/best-practice/provision/aws/readme.md` | 79 | the write-only contract is stated three times: in prose, in a table, and again in the steps |
| `persist-with-rds/best-practice/provision/aws/resources.parameters.ts` | — | jsdoc repeats the readme. the file header, `secret()`, and `getAllParameters` each explain the same KEEP semantics |
| `provision-github/best-practice/provision/github.repo/resources.ts` | 245 | narrative comments, repeated asides, and two comments that are wrong |

### the defects in `github.repo/resources.ts`, beyond length

- **`requireLinearHistory: false, // # no ugly merge commits, woo! 🎉`**
  - the comment says the opposite of what the value does
  - a reader who trusts the comment gets the wrong model of the branch rules
- **`// todo: why do we have to specify this twice?`** (near line 49)
  - an open question has shipped to every adopter
  - answer it in a comment and keep the code, or drop the duplicate
- **`// things we haven't changed from the defaults`** appears twice
- the tag-pattern comment (~L160–164), the production-on-else-apply `.why` (~L174–181), and the
  ruleset `.why` (~L204–206) each tell a story in several lines where one line of mechanism would do

### the ask

1. condense the three files above. for each fact, keep the contract once and cut every restatement
2. fix the two false or stale comments. this is a correctness fix, separate from the style work
3. sweep the whole `best-practice/` corpus with one question: *does a reader need this line to act?*
   - cut each line that restates another
   - cut narration and dated history (it belongs in git, not in a template)
   - a `.why` gets one line unless the mechanism really needs more

### the reference shape

`ahbode/svc-chat` already diverges on the two aws files (#637 is still open), so it condensed them
locally:
- `provision/aws/readme.md`: 132 → 61 lines, with every contract fact kept
- `provision/aws/resources.parameters.ts`: 116 → 56 lines

use either one as the target density. neither is a template to copy verbatim, because both carry
svc-chat's names.

=================== #647 🎙️ task - fix(test): jest testMatch must exclude .agent/.actors (scratch clone of the repo)

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(test): jest testMatch must exclude .agent/.actors (scratch clone of the repo)
**description**
## the gap

`jest`'s `testMatch` walks the whole tree. rhachet keeps host-local runtime state under
`.agent/.actors/`, and an enrolled actor dir holds a **scratch clone of the repo itself** — which
carries that clone's own `*.test.ts` files.

so every jest tier collects the scratch copies as if they were the repo's own suites. the failure
has two faces, and the second is the dangerous one:

1. **duplicate suites** — the same test is collected twice, once real, once from the actor clone.
2. **false red at the gate** — a scratch clone is an arbitrary point-in-time copy, so its suites can
   fail for reasons wholly unrelated to the branch under test. the gate meant to catch real
   regressions then reports a defect that does not exist in the source tree.

CI stays green (fresh checkout, no actor dir), so this fails **locally only** — the same asymmetry
#639 documents for depcheck.

observed in `ahbode/svc-notifications` @ `beav/feat-declapract-upgrade`, 2026-09-27.

## the shape of the fix

1. **templates** — `jest.unit.config.ts`, `jest.integration.config.ts`, `jest.acceptance.config.ts`:
   add the negation to `testMatch`:
   ```ts
   testMatch: [
     // ... extant patterns
     '!**/.agent/.actors/**', // .why = rhachet host-local runtime state; holds a scratch clone of
                              //        this repo, whose suites are not ours to run
   ],
   ```
2. **fix fn** — whichever `.declapract.ts` owns these configs must MERGE the new negation into an
   extant `testMatch`, not merely seed it on a fresh file; otherwise extant repos never receive it
   (the exact miss #639 calls out for `ignorePatterns`).
3. **test** — a config with `testMatch` but no actors negation gains it; one that already has it
   stays unchanged.

applied downstream in `ahbode/svc-notifications` (all three jest configs).

## why upstream

the three jest configs are declapract-DECLARED, so this edit is clobbered on the next
`declapract upgrade` unless the template carries it. that is what separates this from a local
workaround.

## relation to #639

**a peer, not a duplicate.** #639 fixes the same root cause (`.agent/.actors` is gitignored runtime
state that tools walk anyway) for **depcheck** `ignorePatterns`, plus the `.test.yml`
`prepare:rhachet` gap. this issue is the **jest `testMatch`** half, which #639 does not touch. both
were confirmed present in the same repo on the same upgrade, so they are worth a fix together.

=================== #646 🎙️ task - feat(node-service): adopt sdk-aws-lambda 0.7.1 — forAsk, forSqs, { payload }, readonly sinks

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
feat(node-service): adopt sdk-aws-lambda 0.7.1 — forAsk, forSqs, { payload }, readonly sinks
**description**
## .what

adopt `sdk-aws-lambda@0.7.1` across the node-service practice. 0.7 changed the handler contract, and the practice still emits the pre-0.7 shape.

assumes `sdk-aws-lambda@0.7.1` is published — 0.7.0 plus the `FrozenDeep` primitive fix (ehmpathy/sdk-aws-lambda#48). do not pin 0.7.0: its `FrozenDeep` maps a branded primitive (`IsoTimeStamp`, `IsoPriceWords`) to an object type, so any handler with a glossary value in its payload fails `tsc`.

## .what changed in 0.7

| before (≤0.6) | 0.7 |
|---|---|
| `genLambdaEndpoint({ … })` | `genLambdaEndpoint.forAsk({ … })` |
| `genLambdaEndpoint.for.apiGateway(…)` | `genLambdaEndpoint.forApiGateway(…)` |
| an sqs handler via `simple-async-tasks`' `extractTaskParcelFromSqsEvent` | `genLambdaEndpoint.forSqs.perRecord(…)` / `.perBatch(…)` |
| `invoke: async ({ event }) => op(event)` | `invoke: async ({ payload }) => op(payload)` — also `{ headers, event }` |
| a mutable `invoke` input | deep-frozen; typed `FrozenDeep<T>` (exported from the root) |
| `@types/aws-lambda` in devDependencies | carried by the sdk; depcheck flags it as unused |

## .the practice edits owed

1. **`node-service/best-practice/package.json`** — `"sdk-aws-lambda": "@declapract{check.minVersion('0.4.0')}"` → `minVersion('0.7.1')`.
2. **`bad-practices/simple-lambda-handlers/src/**/*.ts.declapract.ts`**
   - `createStandardHandler` → `genLambdaEndpoint.forAsk`, never bare `genLambdaEndpoint` (a bare call no longer exists)
   - `createApiGatewayHandler` → `genLambdaEndpoint.forApiGateway`, never `.for.apiGateway`
   - rewrite the handler body's `({ event }) =>` to `({ payload }) =>`; the `@declapract:review` marker stays
3. **`bad-practices/simple-lambda-{handlers,client}/package.json.declapract.ts`** — the fallback `'^0.1.0'` → `'0.7.1'`. it is a range below the new floor, and unpinned (`rule.require.pinned-versions`).
4. **a new bad-practice, `sdk-aws-lambda-pre-0.7`**, that detects and fixes a repo already on sdk-aws-lambda ≤0.6:
   - `genLambdaEndpoint(` → `genLambdaEndpoint.forAsk(`
   - `.for.apiGateway(` → `.forApiGateway(`
   - `invoke: async ({ event })` → `invoke: async ({ payload })`, with `event` → `payload` inside the arrow body
   - drop `@types/aws-lambda` when no src file imports `aws-lambda` directly
   - flag, never rewrite, an sqs handler built on `extractTaskParcelFromSqsEvent`. the move to `forSqs.perRecord` needs a `z.custom` payload schema, so it is `@declapract:review`
5. **the readme / review note** — state the readonly-sink rule: the payload is frozen, so a mutable array in a domain input no longer accepts it. the repair is `z.array(…).readonly()` in the zod schema plus a `readonly T[]` domain input. `FrozenDeep<…>` on handler signatures is the wrong repair: it spreads the sdk type through consumer code.

## .measured in

ahbode/svc-chat, the 0.6 → 0.7 adoption:

- 11 handlers `.forAsk` + `{ payload }`
- 1 sqs handler → `forSqs.perRecord` with a `z.custom` task-parcel schema
- 1 `readonly` array in a domain input (`imageUuids`), plus `.readonly()` in the zod schema
- `@types/aws-lambda` removed

types, lint, and unit tests are green on 0.7.0 + a pnpm patch that carries the 0.7.1 fix.

=================== #645 🎙️ task - terraform-common: test:format now needs a terraform binary, and says so nowhere

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
terraform-common: test:format now needs a terraform binary, and says so nowhere
**description**
# `terraform-common`: `test:format` now needs a `terraform` binary, and says so nowhere

- from = `ahbode/svc-chat`, route `v2026_09_18.declapract.upgrade` (hazard T8), `0.49.13`

## .the defect

`practices/terraform-common/best-practice/package.json` adds:

```json
"fix:format:terraform": "terraform fmt -recursive provision",
"test:format:terraform": "terraform fmt -recursive -check provision"
```

and chains them into `test:format` / `fix:format`. CI is fine — `.test.yml` runs
`hashicorp/setup-terraform` before `test:format`. but on any host without terraform (a dev laptop,
an agent sandbox), `npm run test:format` now fails with `terraform: command not found`, and so does
every pre-commit or `fix` flow that calls it.

🟡 a smaller ask than the others: CI is green. the cost is local — a format gate that used to need
only node now needs a system binary the repo never declares.

## .the ask

one of:

- skip the terraform half with a clear notice when `terraform` is absent locally, and keep it
  strict in CI (`CI=true`)
- or declare the binary: a readme line, and a `check:tools` step that names it before the format
  run fails on it

=================== #644 🎙️ task - cache: the with-simple-cache floor moves to 0.17.3 (async get) with no migration

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
cache: the with-simple-cache floor moves to 0.17.3 (async get) with no migration
**description**
# `cache`: the `with-simple-cache` floor moves to `0.17.3`, where `get()` turned async, with no migration

- from = `ahbode/svc-chat`, route `v2026_09_18.declapract.upgrade` (hazard T6), `0.49.13`

## .the defect

`practices/cache/best-practice/package.json` declares
`"with-simple-cache": "@declapract{check.minVersion('0.17.3').ifInstalled()}"`. the practice ships
no other file — no source check, no fix, no readme note.

`0.15.4` → `0.17.3` changed the contract a consumer compiles against:

- `SimpleOnDiskCache.get()` returns `Promise<string | undefined>`, where a `SimpleCache<string>`
  consumer expects `string`
- `getCacheDirectory` options lost `s3` and `directoryToPersistTo`; `directory` replaces both

so `apply` bumps the version and every cached handler fails to type-check, with no pointer from the
practice to what changed or how to move.

## .the ask

- a readme (or `plan` note) on the floor bump that names the contract changes above and the
  replacement shape
- ideally a `src/**` check that flags `directoryToPersistTo` / `s3:` cache options, since those are
  mechanical to detect

🟡 related, not a dupe: `#625` covers the family floor (2 of 4 members named). this is the content
of the bump itself.

=================== #643 🎙️ task - logs: leveled-term removes simple-leveled-log-methods but leaves every import of it

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
logs: leveled-term removes simple-leveled-log-methods but leaves every import of it
**description**
# `logs`: `leveled-term` removes `simple-leveled-log-methods` but leaves every import of it

- from = `ahbode/svc-chat`, route `v2026_09_18.declapract.upgrade` (hazard T5), `0.49.13`

## .the defect

`practices/logs/bad-practices/leveled-term/` holds exactly one file, `package.json.declapract.ts`.
its fix deletes `simple-leveled-log-methods` from both dep sections. no `src/**` check or fix
exists, so a source file that still imports the package is left with an unresolved import.

in svc-chat: `src/_topublish/wrapper-fns/withInputOutputTracing.ts:2` imported it, and the build
broke after `apply` with the dep gone.

🟡 that file is itself a vendored fork, which `#635` already asks a bad-practice for. this ask is
the general one underneath: **a practice must not remove a dependency while imports of it
remain.**

## .the ask

one of:

- a `src/**/*.ts` check for `from 'simple-leveled-log-methods'`, with a fix that rewrites to the
  replacement the `logs` practice prescribes, or
- no `package.json` removal while such an import remains — flag it RED instead, so `plan` names
  the files a human must move

a test: a fixture that imports the package either compiles after `apply`, or `plan` reports it.

=================== #642 🎙️ task - dates-and-times: the uni-time fix rewrites imports to iso-time but never adds the dep

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
dates-and-times: the uni-time fix rewrites imports to iso-time but never adds the dep
**description**
# `dates-and-times`: the `uni-time` fix rewrites imports to `iso-time` but never adds the dep

- from = `ahbode/svc-chat`, route `v2026_09_18.declapract.upgrade` (hazard T4), `0.49.13`

## .the defect

`practices/dates-and-times/bad-practices/uni-time/` carries two fixes that disagree:

| file | fix |
|---|---|
| `src/**/*.ts.declapract.ts` | rewrites `from '@ehmpathy/uni-time'` → `from 'iso-time'` |
| `package.json.declapract.ts` | removes `@ehmpathy/uni-time` from both dep sections — **and adds no `iso-time`** |

so after `apply`, every rewritten file imports a package that is not installed. in svc-chat that was
7 files (`IsoTimeStamp`, `IsoDuration`, `asIsoTimeStamp`), and `tsc` failed with
`Cannot find module 'iso-time'`.

## .the ask

the `package.json` fix adds `iso-time` at the floor the practice expects, in the same section
`@ehmpathy/uni-time` sat in. a test: a fixture that imports `@ehmpathy/uni-time` compiles after
`apply`.

=================== #641 🎙️ task - husky: widen check.timestamps to every time-of-day form, and state that prose is in scope

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
husky: widen check.timestamps to every time-of-day form, and state that prose is in scope
**description**
# `husky`: widen `check.timestamps.sh` to every time-of-day form, and say plainly that prose is in scope

- raised = 2026-09-27
- from   = `ahbode/svc-chat`, route `v2026_09_18.declapract.upgrade`
- owner  = `declapract-typescript-ehmpathy`, practice `husky`
- kind   = a pattern widen plus a doc fix, with tests
- supersedes this route's manifest row 18, which asked the opposite (skip prose) and is withdrawn

## .the ask

1. **catch every time of day**, not only `HH:MM:SS`
2. **state in the hook's `.what` / `.why` that prose is in scope** — dreams, dispatches, yields,
   readmes, any staged file but `.ts` / `.sh`. today the header says *"timestamps in snapshots
   permadrift"*, which reads as if snapshots were the only target, and it misled an agent into a
   dispatch that asked the hook to skip prose. the scope is right; the words undersell it

## .the gap — three forms slip past the current pattern

the pattern is:

```
T?[0-9][0-9]:[0-9][0-9]:[0-9][0-9](Z|[+-][0-9][0-9]:?[0-9][0-9])?
```

it requires seconds and a colon separator. measured in svc-chat 2026-09-27 — both forms below were
committed in route yields and passed the hook:

| form | example shape | why it slips |
|---|---|---|
| minutes-only iso | `2026-09-20T<hh>:<mm>Z` | no seconds |
| dash-separated, as in a log filename | `2026-09-20T<hh>-<mm>-<ss>Z` | `-` not `:` |
| bare clock time | `<hh>:<mm>`, `<hh>:<mm> UTC` | no seconds |

(shapes are written with placeholders, since a literal example halts this very hook.)

each is a time of day, so each carries the same permadrift and the same noise the hook exists to
stop.

## .a candidate pattern

```
T[0-9]{2}[:-][0-9]{2}([:-][0-9]{2})?(Z|[+-][0-9]{2}:?[0-9]{2})?   # iso, colon or dash, seconds optional
|\b[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?\b                              # bare clock time
```

⚠️ the bare-clock branch needs care, and the tests should pin it:

- **must still halt**: `<hh>:<mm>`, `<hh>:<mm>:<ss>`, `T<hh>:<mm>Z`, `T<hh>-<mm>-<ss>Z`
- **must still pass**: iso durations (`PT12:30:00` — #566's carve-out stays), a date alone
  (`2026-09-20`), `file.ts:42:7`-style `path:line:col` citations, ratio-like `3:1`, `docker`
  port maps (`5432:5432`), and markdown table alignment rows

the last group is why a naive `[0-9]{2}:[0-9]{2}` is wrong — `path:line:col` and port maps are
common in exactly the prose this hook scans. an anchor on a word boundary plus a max of 23/59
per field is one way; a `T` or `am|pm|UTC|Z` context requirement for the bare branch is another.
the maintainer's call — the ask is the test table above.

## .done when

- `practices/husky/check.timestamps.play.declapract.integration.test.ts` gains the halt and pass
  cases above, and they are green
- the hook header names prose as in scope, in so many words
- the halt message says *"timestamps are forbidden"*, not *"forbidden in snapshots"*

## .see also

- `#566` (closed) — the iso-duration carve-out; keep it
- svc-chat `.agent/repo=.this/role=any/briefs/rule.forbid.timestamps-in-prose.md` — the adopter-side
  rule, with a manual grep until this ships

=================== #640 🎙️ task - fix(simple-lambda-handlers): the migration guide teaches rawEvent — teach { headers, payload, event } once sdk-aws-lambda publishes it

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(simple-lambda-handlers): the migration guide teaches rawEvent — teach { headers, payload, event } once sdk-aws-lambda publishes it
**description**
# 🌙 dream: declapract's migration guide still names `rawEvent`

**kind** reseed · **owner** `ehmpathy/declapract-typescript-ehmpathy` · **caught** 2026-09-20

## .the cue

a sweep for downstream `rawEvent` reads found a **doc** that tells migrators to use it.

## .the gap

`src/practices/node-service/bad-practices/simple-lambda-handlers/.declapract.readme.md` — the guide
for services that move from `simple-lambda-handlers` onto `sdk-aws-lambda` — says (`:33`, `:35`):
*"thread headers via `rawEvent.headers`"*. `rawEvent` appears in 8 files of that tree: the readme,
the templates, their `.declapract.test.ts` peers, and snapshots.

two renames apply, and they fail differently:

| guide says | becomes | how a migrator meets it |
|---|---|---|
| `rawEvent.headers[k]` | `headers[k]` | loud — the key is absent at the destructure |
| `event` for the body | `payload` | quiet — `event` still exists, so the error lands at the use site |

```sh
rhx git.repo.get lines --in ehmpathy/declapract-typescript-ehmpathy --words 'rawEvent' \
  --paths 'src/practices/node-service/bad-practices/simple-lambda-handlers/.declapract.readme.md'
```

## .the shape of the fix

1. readme: teach `{ headers, payload, event }` as a shape, not as a one-field correction
2. sweep the guide for every `event` that names a body → `payload` (grep the word, not `rawEvent`)
3. templates and their tests → both renames; re-snapshot
4. pin the sdk version in the guide, so the next drift is visible

## .why it is not done here

safe (docs and templates for a deprecated practice), but not clean: it lands in another repo, and
it must name a published version.

⚠️ **action it only after the release publishes.** a guide that names a shape no published version
carries is worse than a stale one. the trigger is the first published `sdk-aws-lambda` that carries
`{ headers, payload, event }` — a minor under `0.x`, not a `1.0.0`.

=================== #639 🎙️ task - fix(lint): depcheck must ignore .agent/.actors (gitignored rhachet runtime state)

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(lint): depcheck must ignore .agent/.actors (gitignored rhachet runtime state)
**description**
## the gap

`depcheck` walks the filesystem and does **not** read `.gitignore`. rhachet keeps host-local runtime state under `.agent/.actors/` (gitignored by `.agent/.actors/.gitignore`), and an enrolled actor dir can hold a Claude Code plugin cache full of third-party source. so `npm run test:lint` fails **locally** while CI (fresh checkout, no actor dir) stays green:

```
Missing dependencies
* claude-code: ./.agent/.actors/actor.via.hash=ed62c554/brain/.claude/plugins/marketplaces/claude-plugins-official/plugins/code-modernization/tests/hostile.test.ts
```

observed in `ehmpathy/rhachet-brains-fireworksai` @ `vlad/fix-slugs`, 2026-09-26. any repo with an enrolled actor will hit it.

## the shape of the fix

1. **template** — `src/practices/lint/best-practice/.depcheckrc.yml`, add:
   ```yaml
   ignorePatterns:
     # .why = rhachet host-local runtime state (actor caches, plugin copies);
     #        gitignored, never source, and its files import packages we do not use
     - .agent/.actors
   ```
2. **fix fn** — `.depcheckrc.yml.declapract.ts` merges only `ignores`, so extant repos would never receive the new key. merge `ignorePatterns` the same way: seed the seq if absent, add each absent entry, keep comments via `parseDocument`.
3. **test** — extend `.depcheckrc.yml.declapract.test.ts`: a file with `ignores` but no `ignorePatterns` gains `.agent/.actors`; a file that already has it stays unchanged.

4. **cicd** — the `.test.yml` template's `test-lint` job lints a fresh checkout and never runs `prepare:rhachet`, while `test-integration` and `test-acceptance-locally` do. so ci lints a different tree than every developer, and stays green on a gap that fails each local run. add before `test:lint`:
   ```yaml
   - name: prepare:rhachet
     run: npm run prepare:rhachet
   ```

applied downstream in `ehmpathy/rhachet-brains-fireworksai` (`.depcheckrc.yml` + `.github/workflows/.test.yml`); local lint over the full linked `.agent/` tree went red -> green.

## why upstream

the gap lives in the shared template, so a per-repo patch would be overwritten, or re-needed in every repo, on the next `declapract upgrade`.

=================== #638 🎙️ task - persist-with-rds: tunnel cluster VALUE is wrong in both #539 and #562 - and the config/schema pair has no clamp

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
persist-with-rds: tunnel cluster VALUE is wrong in both #539 and #562 - and the config/schema pair has no clamp
**description**
# `persist-with-rds`: the tunnel cluster VALUE is wrong in both filed fixes — and the schema/config pair has no clamp

- raised   = 2026-09-24
- from     = `ahbode/svc-chat`, route `v2026_09_18.declapract.upgrade`
- version  = `declapract-typescript-ehmpathy@0.49.13`
- ⚠️ **supplements #539 and #562. it is deliberately NOT the shape half — that is #539's 7a.**

## 🔴 .correction to this issue's first body

this issue opened with the **shape** mismatch (template emits strings, schema demands objects). that
is a duplicate of **#539**, whose title states it exactly: *"config template regresses tunnel
bastion/cluster to strings (object shape required)"*. apologies for the noise.

what follows is the part of this round's diagnosis that is **not** in #539 or #562, plus the clamp
whose absence let the pair drift.

## .the defect that is unfiled — both filed fixes ship the wrong VALUE

**#539** prescribes:

```json
"bastion": { "exid": "vpc-main-bastion" },
"cluster": { "name": "@declapract{variable.databaseName}" }
```

**#562** — a different author, a different month — prescribes the identical target:

```jsonc
"cluster": { "name": "@declapract{variable.databaseName}" },
```

🔴 **both nest the value and keep the old variable.** so an adopter who receives either fix gets

```json
"cluster": { "name": "chatdb" }
```

the correct shape that holds the wrong value. the tunnel still fails `cluster not found`, because the
cluster and the database are different resources with different names:

| field | what it must name | svc-chat's value |
|---|---|---|
| `database.name` | the logical database inside the cluster | `chatdb` |
| `tunnel.cluster.name` | the **rds cluster** the tunnel targets | `ahbodedb` |

`databaseName` is the wrong variable for the cluster field in every repo where the two differ, and
they differ in every repo that shares a cluster.

⇒ **the shape defect and the value defect are independent, and neither filed issue sees the second.**
#539's fix would close 7a, close 7c, and leave this live — while it *looks* addressed, because the
field now has the right shape.

## .the evidence that it is real

four repos in the `ahbode` org carry the same hand-patch, each with the cluster name written by hand
against the practice's own variable:

| repo | what it holds |
|---|---|
| `ahbode/svc-home-services` | `"cluster": { "name": "ahbodedb" }` |
| `ahbode/svc-jobs` | same |
| `ahbode/svc-notifications` | same |
| `ahbode/svc-chat` | same, plus `"bastion": { "exid": "vpc-main-bastion" }` |

n=4 hand-patches of one template is not four independent choices. it is one defect, absorbed four
times — and #539's fix would not retire a single one of them.

🔴 **and #539's own 7c makes it worse.** the `.declapract.ts` fix is a shallow top-level merge, so the
template's whole `database` object replaces the repo's. that means every one of those four
hand-patches is reverted on the next `declapract apply`. the value fix and the deep-merge fix (7c) are
the pair that actually lands the repair.

## .the ask

1. **point the cluster field at a cluster variable, not `databaseName`** — a new
   `variable.databaseClusterName` (or equivalent), so an adopter whose cluster and database differ
   gets a correct value out of the box. update **both** #539's and #562's prescribed target
2. ⇒ these two issues currently prescribe the same wrong value from two authors, so whichever lands
   first should carry the corrected variable, and the other should be rebased onto it

## .the clamp whose absence let this drift

the practice ships `best-practice/config/{test,prep,prod}.json` **and**
`best-practice/src/utils/config/config.schema.ts`, and no test parses the first against the second.

that is exactly why the string/object regression in #539 shipped unnoticed, and it is a one-test fix:

> for each `config/*.json`, parse it with the shipped `config.schema.ts` and assert it validates.

⇒ a value defect this test cannot catch, but the shape class it can, permanently. #539 would have
been caught at author time.

## .see also

- `#539` — the shape (7a) and the shallow-merge clobber (7c); this issue supplements, never duplicates
- `#562` — the same target shape and the same wrong value, from a different author
- `node_modules/declapract-typescript-ehmpathy/dist/practices/persist-with-rds/best-practice/config/prep.json:23-28`
- `node_modules/declapract-typescript-ehmpathy/dist/practices/persist-with-rds/best-practice/src/utils/config/config.schema.ts:74-80`

=================== #637 🎙️ task - persist-with-rds: the derived param form is half-shipped — config uses it, resources.parameters.ts does not

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
persist-with-rds: the derived param form is half-shipped — config uses it, resources.parameters.ts does not
**description**
# `persist-with-rds`: ship the sdk-config derived param form, and supersede #591's clamp

- raised   = 2026-09-24
- from     = `ahbode/svc-chat`, route `v2026_09_18.declapract.upgrade`
- version  = `declapract-typescript-ehmpathy@0.49.13`, `sdk-config@0.3.0`
- kind     = a template change plus its clamp, and they must move together
- ⚠️ **blocked on an infra change** — see `.gate` below

## .the ask

move `persist-with-rds` to the sdk-config **derived** param location, so every adopter can write the
bare `$.at(aws::param)` placeholder with no explicit path. that requires the template and the #591
clamp change in **one PR**, which cites #591 as superseded.

## 🔴 .correction — the practice already SHIPS the bare placeholder, so it contradicts itself today

this issue first framed the derive as a change the practice had **not yet taken**. that was wrong,
and the truth is sharper. measured 2026-09-25 against `0.49.13` on disk:

`best-practice/config/{test,prep,prod}.json` ships the **bare** placeholder for all three passwords:

```json
"for-plan":  { "username": "…", "password": "$.at(aws::param)" },
"for-apply": { "username": "…", "password": "$.at(aws::param)" },
"crud":      { "username": "…", "password": "$.at(aws::param)" }
```

`best-practice/provision/aws/resources.parameters.ts` declares, in the same practice:

```ts
secret({ name: `${namespace}.database.role.crud.password` }),                              // dotted, tier-scoped
secret({ name: `/{org}/{project}/database/role/cicd/for-plan/password` }),                 // slash, tierless
secret({ name: `/{org}/{project}/database/role/cicd/for-apply/password` }),                // slash, tierless
```

the bare placeholder derives `/{org}/{repo}/{choice}/database.role.cicd.for-plan.password`.
⇒ **neither declared name is what the config asks for.** all three disagree — the crud name on its
separator and its tier segment, the two cicd names on both.

so this is not *"adopt a new form"*. **the move is half-done in a shipped release**: the config half
landed, the provision half did not. an adopter who takes the practice verbatim gets a wish that
manages three params its own config never reads, and a config that reads three params no wish
declares.

🟡 that also explains why the split went unnoticed: an adopter who kept **explicit** paths in its
config (as `ahbode/svc-chat` did) never exercises the derive, because `asSdkConfigPath` short-circuits
at line 39 on `explicitPath !== null`. the contradiction is invisible until the first repo writes the
bare form the practice's own config prescribes.

## 🔴 .and the tier segment reads the WRONG envar

`resources.parameters.ts` builds its tier from `access`:

```ts
const { access } = getEnvironment.static();
const accessSlug = access === 'prep' ? 'dev' : access;
```

but the derive's tier is `choice` — the **CONFIG** slug, per `genGetConfig`
(`choice: input.environment.config`). those are two axes, not one name for one axis:
`sdk-environment`'s `isValidConfigForAccess` returns `true` unconditionally for prep, so
`ACCESS=prep CONFIG=prod` is legal and the params that run reads are **prod's**.

⇒ a name built from `access` points at the wrong tier in exactly that case. the fix must read
`config`, which `getEnvironment.static()` already returns alongside `access` — a one-word change, no
new import. (with CONFIG unset, `getEnvConfig.fromAccess` defaults it to the access, so the common
case is unchanged — which is why this has never bitten.)

🟡 a welcome side effect: the derive names the tier with the config slug, so the legacy `dev` cast
retires for these params and `accessSlug` becomes dead code.

## .the fix, concretely

```ts
-const { access } = getEnvironment.static();
-const accessSlug = access === 'prep' ? 'dev' : access;
+const { access, config } = getEnvironment.static();   // access TAGS; config NAMES

 export const getAllParameters = (input: {
-  accessSlug: string | null;
+  choice: string | null;
 }): DeclaredAwsSsmParameterSecure[] => {
-  const slug = input.accessSlug ?? accessSlug;
-  const namespace = `{org}.{project}.${slug}`;
+  const namespace = `/{org}/{project}/${input.choice ?? config}`;

   return [
-    secret({ name: `${namespace}.database.role.crud.password` }),
-    secret({ name: `/{org}/{project}/database/role/cicd/for-plan/password` }),
-    secret({ name: `/{org}/{project}/database/role/cicd/for-apply/password` }),
+    secret({ name: `${namespace}/database.role.crud.password` }),
+    secret({ name: `${namespace}/database.role.cicd.for-plan.password` }),
+    secret({ name: `${namespace}/database.role.cicd.for-apply.password` }),
   ];
 };
```

`getResources` in `resources.ts` passes `{ accessSlug: null }` → `{ choice: null }`.

⇒ `ahbode/svc-chat` has taken exactly this change locally, plus the bare placeholder in
`config/{prep,prod}.json`. `pnpm fix` and the type check are green.

## .why now

`sdk-config@0.3.0` shipped org-scoped auto-resolution. `$.at(aws::param)` now derives:

```
/{org}/{repo}/{config}/{keyPath}
```

verbatim, from `sdk-config/dist/domain.operations/asSdkConfigPath.js:50`:

```js
return `/${input.org}/${input.repo}/${input.choice}/${input.keyPath}`;
```

`choice` is the config slug (`test` / `prep` / `prod`). so the namespace uses **slashes** and the key
path uses **dots**:

```
/ahbode/svc-chat/prep/database.role.cicd.for-plan.password
```

every repo that wants the bare placeholder must hold its params at that derived location. until the
template ships it, every adopter keeps explicit paths in `config/*.json`, and the org inherits a
split between the crud param (dotted, movable) and the two cicd params (slash, pinned).

## 🔴 .gate — the IAM pin must allow the derived form FIRST

#591 pinned the prod plan role's `kms:Decrypt` to:

```
arn:aws:ssm:*:*:parameter/*/svc-*/database/role/cicd/for-plan/*
```

that needs literal slashes the whole way through and carries **no tier segment**, on #591's stated
ground:

> the aws ACCOUNT separates prep from prod, never the name

the derived form is dotted AND has a tier segment, so it **cannot match**. the infra project adds a
second pattern, additively:

```
arn:aws:ssm:*:*:parameter/*/svc-*/*/database.role.cicd.for-plan.password
```

⇒ **if this practice ships the derived form before that pattern is live, every adopter creates a
param its prod plan role cannot decrypt** — the precise failure #591 was written to prevent. so the
order is: infra pin, then this PR.

two properties worth a note on the new pattern:

- **the grant split survives.** `for-plan` and `for-apply` end in different literals, so a pin on one
  still cannot match the other. that was the point of the split and it is intact
- **the new pattern is tighter than the old.** the current pin ends in `*` — any param under
  `for-plan/`. the new one ends in a literal filename

## 🔴 .the clamp #591 shipped goes red, and that is by design

`practices/persist-with-rds/ssm-cicd-param-names.declapract.integration.test.ts` asserts the slash
form. this issue first said four of five cases break; re-read against the file, **all six
assertions break**, `case2` included:

| assertion | result |
|---|---|
| `toContain('/database/role/cicd/for-plan/password')` | 🔴 slashes become dots |
| `toContain('/database/role/cicd/for-apply/password')` | 🔴 same |
| `not.toContain('.database.role.cicd.for-plan')` | 🔴 the derived form IS dotted |
| `toContain('projectName}/database/role/cicd/for-plan/password')` | 🔴 the tier segment now sits between them |
| the emitted name-lines snapshot | 🔴 every line changes |
| `case2` — `toContain('${namespace}.database.role.crud.password')` | 🔴 derived is `${namespace}/database.role.crud.password` |

`case2` was mis-read as green because crud stays **dotted in its keyPath**. but its **separator**
moves: the tier now ends the slash namespace, so the join is `/`, not `.`. the assertion pins the
`.` and reddens.

🟡 `not.toContain('${slug}/database/role/cicd')` stays green, but only incidentally — the variable is
renamed `choice`. it is a name-coupled assertion, so it would pass a genuinely wrong template too.
worth a rewrite rather than a keep.

that clamp was built to prevent exactly this change, and **it works as designed**. so it is not a
defect to route around — it is a decision to reverse, on the record, in the same PR.

🟡 **the clamp does not run in an adopter.** it reads `__dirname/best-practice/…` and sits at the
practice root, so it is neither loaded as a declaration nor copied out. `ahbode/svc-chat` took the
derived form locally and stayed green — the clamp is purely this repo's CI, which is why it must
move in the same PR rather than block adopters.

## ⚠️ .one reversal to acknowledge

the derived form puts `prep` / `prod` back into the param name, which reverses #591's stated ground
above. it is **redundant rather than harmful** — the account still separates them — but it deserves a
recorded call rather than a quiet side effect.

## .the adopter migration, once both land

`rhx aws.ssm.param.set --from` is a **copy, not a move** — the source param survives. so with both
ARN patterns live, every repo migrates on its own schedule and no flag day is needed.

1. **infra** adds the second pattern — both forms allowed
2. **this practice** ships the derived form + the superseded clamp
3. **per repo** — copy old name to derived name:
   ```sh
   rhx aws.ssm.param.set --env prep \
     --into /ahbode/svc-chat/prep/database.role.cicd.for-plan.password \
     --from  /ahbode/svc-chat/database/role/cicd/for-plan/password \
     --mode apply
   ```
4. **per repo** — flip `config/*.json` to bare `$.at(aws::param)`
5. **infra** drops the first pattern once the last repo has moved

step 5 is the only one that needs coordination, and it is reversible until it runs.

🟡 the skill in step 3 currently lives as two local copies (`ahbode/svc-home-services`,
`ahbode/svc-jobs`) with a lift into ghlitch owed — `ehmpathy/rhachet-roles-ghlitch#129`.

## .blast radius

the org runs ~22 `svc-*` repos against the shared `ahbodedb` cluster. not all carry cicd params
today, but every repo that adopts `persist-with-rds` inherits whichever form this practice ships.

## .see also

- `declapract-typescript-ehmpathy#591` — CLOSED COMPLETED; the pin's origin, the arn quote, and the
  five-test clamp this PR must supersede
- `ehmpathy/rhachet-roles-ghlitch#129` — the lift of the migration skill step 3 uses
- `node_modules/sdk-config/dist/domain.operations/asSdkConfigPath.js:50` — the derive, verbatim

=================== #636 🎙️ task - fix(lambda-caller): the ancient ADDRESS half ships no slug helper, so every adopter re-derives it with an as-cast

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(lambda-caller): the ancient ADDRESS half ships no slug helper, so every adopter re-derives it with an as-cast
**description**
## .what

the lambda-caller rewrite wires every peer call to `getOneAwsLambdaCallerContextAncient`, and
ships **no way to compute the slug that context needs**. every adopter with an ancient peer
re-derives the same helper by hand — and the naive derivation needs an `as`-cast that lies.

`#631` covers the **dialect** half of `ancient` (`struct.payload`). this is the **address** half,
and it was left to the adopter.

## .the gap, precisely

`askLambdaEndpoint` builds its target as `${service}-${access}-${function}`. an ancient peer
publishes under a legacy `dev` slug that disagrees with **access** below prod:

| access | the slug an ancient peer publishes under |
|---|---|
| `test` | `dev` |
| `prep` | `dev` |
| `prod` | `prod` |

so a caller must map access → slug. the practice emits the context helper and not the map, so the
adopter writes it.

## 🔴 the naive derivation needs an `as`-cast, and the cast lies

`EnvironmentAccessTier` is `test | prep | prod`. `dev` is not a member. so the obvious shape —

```ts
const slug: EnvironmentAccessTier = access === 'prod' ? 'prod' : ('dev' as EnvironmentAccessTier);
```

— pushes a `dev` value through a type that forbids it. the compiler then believes every downstream
consumer receives a member of `EnvironmentAccessTier`, and one of them does not.

⇒ **that is the exact silent fault the whole ancient/contemp transition exists to kill**, and the
practice's own output leads an adopter straight into it.

## .the shape that works, and the two traps in it

measured on `ahbode/svc-chat` @ `beav/feat-declapract-upgrade`:

```ts
/** the fleet slug a caller addresses a peer by — an access, OR the legacy `dev` slug */
export type LambdaEnvSlug = EnvironmentAccessTier | 'dev';

/** the two slugs an ANCIENT peer is ever published under */
export type LambdaEnvSlugAncient = Extract<LambdaEnvSlug, 'prod' | 'dev'>;

export const sdkAwsLambdaEnvAccessAncient = (input?: {
  access: EnvironmentAccessTier | null;
}): LambdaEnvSlugAncient => {
  const access = input?.access ?? envStatic.access;
  return access === 'prod' ? 'prod' : 'dev';
};
```

🔴 **trap 1 — `dev` must be a first-class union member, never a cast.** `LambdaEnvSlug` adds it to
the type so the slug stays compiler-tracked end to end.

🔴 **trap 2 — the ancient operation must return the EXACT set, not the family set.** to declare
`LambdaEnvSlug` as the return widens it past what that operation can emit, so it admits `prep` and
`test` — which an ancient peer never publishes. a consumer whose own enum predates `prep` then
rejects a value the caller cannot produce. `simple-async-tasks` is one such consumer; it still
reads `test | prod | dev`. ⇒ `Extract<…, 'prod' | 'dev'>` is assignable to every such consumer, so
no cast is owed anywhere.

🟡 trap 2 is the subtle one, and it bites only at the second consumer. an adopter who declares the
family set compiles fine until an older peer sdk is wired, then gets a type error with no obvious
cause.

## 🟡 the helper choice IS the migration ledger

`grep AccessAncient` lists every peer still published under `-dev-` only. a per-peer flip to the
contemp counterpart retires one row. once zero remain, the ancient branch **and** the divergent
`dev` slug retire together.

⇒ that property is worth a deliberate ship, rather than one more thing each adopter invents under
a different name — a different name loses the ledger.

## .the ask

1. **ship the slug helper**, as a pair — an `Ancient` and a `Contemp` operation that each declare
   their own exact return set
2. **declare `dev` as a first-class union member**, so no adopter reaches for a cast
3. **make the exact-set return a stated requirement, not an incidental**, since trap 2 bites at the
   second consumer and reads as unrelated
4. **name the pair so a grep is the ledger**, and say so in the practice's readme

⚠️ **or close it one layer down instead.** if `sdk-aws-lambda` accepted an ancient context and
derived the slug itself, the practice would need to ship naught. that is the stronger fix if the
two `ancient` axes are truly never independent — and `#631` records that i did **not** establish
that they never are.

## .what is NOT established

- whether other adopters hit trap 2, or whether `simple-async-tasks` is the only consumer with a
  pre-`prep` enum. this is one repo's census
- whether `sdk-aws-lambda` would rather own this than the practice (see the caveat above)
- whether the contemp half needs a helper at all, or whether `access` passes through untouched —
  this repo ships one for symmetry, and symmetry is a preference rather than a measurement

## .see also

- found by `ahbode/svc-chat` route `v2026_09_18.declapract.upgrade`, stone
  `3.1.repair.test.defects`
- `#631` — the DIALECT half of the same `ancient` fix; this is the ADDRESS half
- `ehmpathy/sdk-aws-lambda#42` — widen `ContextAwsLambdaCaller.env.access` to accept the `dev`
  slug. the library-side half, and a precondition for the helper's return type to flow with no cast

=================== #635 🎙️ task - fix(bad-practice): a vendored fork of visualogic's withLogTrail, drifted and silent on errors

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(bad-practice): a vendored fork of visualogic's withLogTrail, drifted and silent on errors
**description**
## .what

`src/_topublish/wrapper-fns/withInputOutputTracing.ts` is a **vendored fork** of `visualogic`'s
`withLogTrail`. it has drifted on four axes, and one of the four is a shipped defect: **it has no
error branch at all**.

it lives under `_topublish/`, which names it as a candidate for publication — so the fork is on a
path to become a package, rather than on a path to retire.

⇒ the ask: declapract should **detect** a vendored fork of a library it already requires, and name
the migration. this one is the specimen.

## 🔴 the fork is proven, not inferred — the jsdoc is byte-identical, todos and all

both files carry the same jsdoc block, including all three `todo` lines, verbatim. one of those
todos names its own replacement, half-spelled:

```
todo: hookup visual tracing w/ external lib (vi...lo...)
```

⇒ `vi…lo…` is **`visualogic`**. the fork's own comment records that it was always meant to become
the library it was copied from, and nobody closed the loop.

## .the four axes of drift

| axis | the fork | `visualogic@1.3.3` `withLogTrail` |
|---|---|---|
| **arity** | variadic — `<T extends (...args: any[]) => any>` | `(input: TInput, context: TContext) => TOutput` |
| **log source** | a module singleton — `import { log } from '@src/utils/logger'` | injected via `TContext extends VisualogicContext` |
| **duration** | `durationReportingThresholdInSeconds: number` | `duration?: { threshold: UniDuration }` |
| 🔴 **errors** | **no error branch at all** | `log?: { error?: (error: Error) => any }` |

### the error axis is the one that ships harm

the fork logs input and output. it logs **naught** on a throw. so every operation it wraps is
**silent when it fails** — the wrapper that exists to make an operation observable is the one that
hides its worst moment.

`withLogTrail` carries an `error` hook for exactly that case. the fork predates it and never
gained it.

⇒ an on-call engineer reads a trace, sees the input line, sees no output line, and has no record of
why. that is the harm, and it is nameable.

## .the arity axis is why it is not a rename

measured on `ahbode/svc-chat` @ `beav/feat-declapract-upgrade`:

- **3** operations are wrapped by the fork
  - `getDisplayableMessages.ts:14` · `emitConsumerTransmissions.ts:17` ·
    `determineBestChannelForConsumerTransmission.ts:23`
- all three take a **single** destructured argument — `async ({ dbConnection, … })`
- `withLogTrail` returns a **two-argument** function
- ⇒ **~9 invocation sites break** on arity: 3 in production code, 6 in integration tests

so a swap is a **migration**, not an identifier change. an adopter who takes a naive fixer gets a
broken build.

🔴 **and it is the same migration a second practice already demands.** the `persist-with-rds`
practice's `withDatabaseConnection` → `withDatabaseContext` move is also a shift to
`(input, context)`, at the same files. ⇒ **these two should converge into one migration**, or an
adopter pays the same rewrite twice at the same call sites.

## .the ask

1. **detect it.** a check that flags a local module whose jsdoc or shape matches an export of a
   package already in `dependencies`. the jsdoc match here is exact, so even a crude comparison
   catches it
2. **name the migration, do not silently fix it.** `#626` already records the trap of an EXISTS
   check with no fix; this is the opposite hazard — a fixer that rewrites the identifier and leaves
   9 call sites broken. the practice should state the arity change and the `(input, context)` shape
3. **converge with `withDatabaseContext`.** both are the same shape change at the same files. one
   migration, not two
4. **consider the wider class.** `_topublish/` on this repo holds several wrapper-fns and
   procedure-fns of the same character. the fork is unlikely to be one file, and a check that fires
   per-file will report a cluster

## .the blast radius, measured

| what | count |
|---|---|
| operations the fork wraps | 3 |
| invocation sites that break on arity | ~9 (3 prod, 6 test) |
| operations with no error log today | 3 |

## .what is NOT established

- whether other adopters carry the same fork. this is one repo's census
- whether `visualogic`'s `duration.threshold: UniDuration` accepts a bare number, or whether the
  threshold value must also be rewritten. i read the `.d.ts` and not the implementation
- whether the rest of `_topublish/` forks the same library or different ones — the cluster is
  asserted from the directory's character, not from a file-by-file read

## .see also

- found by `ahbode/svc-chat` route `v2026_09_18.declapract.upgrade`
- `#633` — `fix(persist-with-rds): withDatabaseContext requires a context its own example omits`,
  the migration this one should converge with
- `#626` — the EXISTS-check-with-no-fix trap this ask deliberately avoids

=================== #634 🎙️ task - fix(#565): the X.contract practice ships code that no longer compiles, and .ref() crashes at cold start

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(#565): the X.contract practice ships code that no longer compiles, and .ref() crashes at cold start
**description**
## .what

`#565` proposes a **blocker** rule: a dobj in a published i/o contract must be referred to via
`X.contract`, not `X.schema`. two defects, both measured at `domain-objects@0.34.0`, bear on it
before it becomes a blocker.

🔴 **defect 1 — `#565`'s own proposed code no longer compiles.**
🔴 **defect 2 — the `.ref()` half throws at MODULE LOAD, so an adopter gets a cold-start crash.**

## 🔴 defect 1 — `contract` became a CALL between 0.33.0 and 0.34.0

`#565` writes the target shape as a property access:

```ts
// #565's proposed template change, verbatim
const outputSchema = z.object({
  service: HomeService.contract.nullable(),
});
```

at `0.34.0` that is a **type error**. `contract` is a getter that returns a *function*, never a
schema:

```ts
// node_modules/domain-objects/dist/manipulation/getContract.d.ts:64
export type DomainObjectContract =
  <TClass extends ConstructorOf<any>>(this: TClass) => ContractOf<TClass>;

// node_modules/domain-objects/dist/instantiation/DomainObject.d.ts:78
static get contract(): DomainObjectContract;
```

and the library's own jsdoc states the change outright:

> *"it is a CALL, not a property, because typescript carries a subclass's identity through a call
> and never through a property access. invoke it on the class."*

⇒ the correct form is `HomeService.contract().nullable()`. `#565` was authored against `0.33.0`,
where `contract` was a `ZodSchema` superset. **a template stamped from `#565` as written would
break every adopter's typecheck**, so the issue body needs the paren before the practice lands.

⚠️ note the ban on a detached receiver, too: `const c = X.contract; c()` is a compile error by
design. any codegen that lifts the member before it calls it will fail.

## 🔴 defect 2 — `.ref(by)` throws at module load where the grain is undeclared

the `.ref(by)` half of the same API is the one a **reference** field wants — a key-only slice rather
than the whole composed dobj. it requires the named grain to be declared:

```
✋ ConstraintError: ChatThread.contract().ref('primary') requires `static primary` on
   ChatThread to name at least one key field
     at getKeysOrThrow  → pickDeclaredKeys → buildKeyContract → buildContractRef
```

measured live on `ahbode/svc-chat` @ `domain-objects@0.34.0`, `sdk-aws-lambda@0.6.0`. the adoption
was **attempted for real** in a handler, then run.

### the severity is the part that matters

a handler's `schemaInput` is a **module-level const**. so the throw lands at **import**, never at
request validation:

| where it lands | what an adopter sees |
|---|---|
| request validation | a `400`. recoverable, one endpoint, one caller |
| 🔴 **module load** | a **cold-start crash**. the endpoint is dead on deploy |

in this repo that was three endpoints, all of which would have failed on first invoke after release.

### why it fires so easily

`DomainEntity` **types** `static primary: readonly [string]` and supplies **no runtime default** —
`DomainEntity.js` sets none — so `dobj.primary` is `undefined` unless the subclass declares it.

walked across `ahbode/svc-chat`'s `src/domain.objects/` at the time of the run: **zero of 7 dobjs
declared `static primary`.** all seven declared `static unique` alone. that is a plausible shape for
any repo whose dobjs were authored before `primary` carried weight.

🟡 **`svc-chat` has since repaired its own half**, which matters to this ask because it measured
what the migration actually costs. six of the seven now declare `public static primary = ['uuid'] as
const`; the seventh (`AsyncTaskEmitConsumerTransmissions`) has no `uuid` field, only `id?: number`,
so a primary there would make every reference carry a database serial — a design call, not a
mechanical one. four gates green after the change: types, lint, format, and 32/32 integration —
**zero regressions.**

⇒ so the repair is one line per dobj and it broke no test. **that is an argument for the practice to
ship the migration rather than merely require the end state.**

🟡 **the bare `.ref()` union form is no escape.** it unions the *declared* grains, so it yields the
unique key — `{ externalId }` here, where the handler takes `{ uuid }`. wrong shape, so it fails at
the payload rather than at load. quieter, still wrong.

## .the ask

1. **fix `#565`'s example** — `X.contract()`, with the paren, and note the detached-receiver ban
2. **declare the precondition** before the rule becomes a blocker: `.ref(by)` needs `static <by>` on
   the dobj. a practice that requires `.ref('primary')` implicitly requires every adopter's dobjs to
   declare `static primary`, and an adopter cannot see that from the rule text
3. **consider a check that fires at plan time**, not at cold start. the failure mode is severe
   enough that the practice should detect an undeclared grain before a deploy does
4. **name the migration**: if the practice wants `.ref('primary')`, it should ship the `static
   primary = ['uuid']` half too, or say plainly that an adopter declares it first

## .the blast radius, measured

a first draft of this ask claimed the `static primary` migration was expensive because `primary` is
read *"by `refByPrimary`, by `serialize`, and by the identity `with-domain-driven-caching` builds."*
**two of those three were wrong**, and a grep for `\.primary` across the installed packages settles
the real list:

| reader | reads `.primary`? |
|---|---|
| `isRefByPrimary.js` | yes |
| `refByPrimary.js` | yes |
| `getContract.js:207` | yes |
| `getContractRef.js:76,237` | yes |
| `getPrimaryIdentifier.js:26` | yes |
| `serialize` | **no** — absent from the reader list |
| `with-domain-driven-caching`'s `ref()` | **no** — `refDomainObject = (dobj) => dobj.name` |

⇒ the migration does **not** touch serialization or cache identity. that is a materially cheaper
change than the first draft claimed, and it is why item 4 below is a reasonable ask rather than an
expensive one.

## .what is NOT established

- whether other adopters already declare `static primary`. this is one repo's census
- whether `#565`'s `.contract` (composition) half has the same load-time hazard — it does not call
  `getKeysOrThrow`, so it likely does not, but that was not measured
- `0.33.0` → `0.34.0` was not read as a changelog; the API change was found by a read of the
  installed `.d.ts` against `#565`'s prose

## .see also

- `#565` — the practice proposal these two defects bear on
- found by `ahbode/svc-chat` route `v2026_09_18.declapract.upgrade`, fulcrum **F8**

=================== #633 🎙️ task - fix(persist-with-rds): withDatabaseContext requires a context its own example omits

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(persist-with-rds): withDatabaseContext requires a context its own example omits
**description**
# 🌙 dream: `withDatabaseContext` requires a `context` arg its own doc example omits

- kind  = reseed
- owner = `ehmpathy/declapract-typescript-ehmpathy`
- caught 2026-09-22

## .the cue that fired

the D10 repair moved two ops from `withDatabaseConnection` to `withDatabaseContext`, and the
compiler then demanded a **second argument at all 11 call sites** — `await sendMessage(input, {})`.
that `{}` read wrong, so i went to the wrapper's own docs and found them in direct contradiction.

## .the gap, precisely

the practice ships this jsdoc, verbatim:

```ts
 *   await findById({ id: 821 }); // note how we don't have to pass in the dbConnection
```

and this signature, in the same file:

```ts
return async (
  input: P1,
  context: Omit<P2, 'dbConnection'> & { dbConnection?: DatabaseConnection },
) => { … }
```

**`context` is positional and required.** every key within it can be absent — `dbConnection` is
optional, and in the common case `P2` is `DatabaseContext` so the `Omit` leaves `{}` — but the
parameter itself is not. ⇒ the documented call does not compile, and the call that does compile
passes a literal `{}` at every site.

measured on `ahbode/svc-chat` @ `beav/feat-declapract-upgrade`: 11 forced `{}` arguments across two
domain operations.

🟡 **the wrapper's whole purpose is to make the connection implicit.** a mandatory empty object at
every call site is the exact ceremony it exists to remove — and the jsdoc proves the author agreed.

## .the shape of the fix

`context` takes a default, so the documented one-arg call is the real one:

```ts
return async (
  input: P1,
  context: Omit<P2, 'dbConnection'> & { dbConnection?: DatabaseConnection } =
    {} as Omit<P2, 'dbConnection'> & { dbConnection?: DatabaseConnection },
) => { … }
```

🟡 the default value needs a cast, because ts cannot prove `{}` satisfies a generic `Omit<P2,…>` —
the same `microsoft/TypeScript#35858` limit the file's own in-body cast already records and
documents. so the cast is not a new debt; it is the one already declared, applied once more.

⇒ the **stronger** fix is to constrain `P2 extends DatabaseContext` such that
`Omit<P2, 'dbConnection'>` is provably `{}` for the default case, and keep `context` required for
the transaction case. i did not settle which is right, which is why this is caught rather than closed.

**clamp it** — a fixture that calls a wrapped op with **one** argument, exactly as the jsdoc shows.
red today, green after.

## .why it is not done in this round

- **safe?** no — a signature change on a wrapper every persistence op composes
- **clean?** no — the fix is upstream; a local edit is reverted by the next `declapract apply`

⇒ and the 11 `{}` arguments are correct against today's signature, so the repo is not broken. it is
noisy, which is a maintenance cost and never a shipped harm.

## ⚠️ what is NOT established

whether the required `context` is deliberate — a way to force the caller to think about whether they
hold a transaction. **if so, the jsdoc is the defect and the signature is right**, and the fix is a
doc edit rather than a signature edit. the two artifacts disagree; which one is wrong is a call for
the practice's author, not for an adopter.

## .provenance

- route  = `.route/v2026_09_18.declapract.upgrade`, stone `3.1.repair.test.defects`
- the diagnosis that surfaced it: `3.1.repair.test.defects.yield.md`, defect **D10**
- peer dreams from the same practice:
  `v2026_09_22.reseed.with-database-transaction-declares-an-unreachable-return.md` ·
  `v2026_09_22.repair.migrate-the-13-residual-with-database-connection-sites.md`

=================== #632 🎙️ task - fix(tests-node): the shipped catch ships cause error where error is unknown

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(tests-node): the shipped catch ships cause error where error is unknown
**description**
# 🌙 dream: the `tests-node` practice ships `{ cause: error }` inside a catch, which cannot compile

- kind  = reseed
- owner = `ehmpathy/declapract-typescript-ehmpathy`
- caught 2026-09-22

## .the cue that fired

two type errors in files the upgrade **added** — `git status` reports both as `A`, so neither
existed on `origin/main`. a defect that arrives with a new file is the practice's, not the repo's.

## .the gap, precisely

`practices/tests-node/best-practice/jest.integration.env.db.ts:87` ships:

```ts
} catch (error) {
  throw new Error('…', { cause: error });
}
```

under `useUnknownInCatchVariables` — which `@tsconfig/strictest` turns on, and which this practice
family's own tsconfig extends — a `catch` binds `unknown`. `ErrorOptions.cause` is typed
`Error | undefined`. ⇒ `unknown` is not assignable.

measured on `ahbode/svc-chat` @ `beav/feat-declapract-upgrade`, at the **same line number**
upstream: `jest.integration.env.db.ts:87` and `src/.test/useKeyrack.ts:75`.

🟡 **so the practice ships a file its own strictness flag rejects.** the same shape as the
`biome.jsonc` case already caught — an artifact the practice emits that fails a gate the practice
declares.

## .the shape of the fix

```ts
} catch (error) {
  throw new Error('…', {
    cause: error instanceof Error ? error : new Error(String(error)),
  });
}
```

the narrow, never a cast. a non-Error throw is re-homed into an `Error` rather than dropped, so the
thrown value still reaches the reader.

🟡 **the clamp is free**: a type check over any repo that adopts `tests-node` with `strictest` goes
red today and green after.

## .why it is not done in this round

- **safe?** yes, locally — both sites carry the narrow now
- **clean?** no, upstream — the next `declapract apply` re-emits the template and reverts it

## ⚠️ what is NOT established

how many other `catch`-and-`cause` sites the practice corpus carries. i found the two that this
repo's type check surfaced; i did not sweep the practice's templates for the pattern, and the fix
is worth a sweep rather than a two-site patch.

## .provenance

- route  = `.route/v2026_09_18.declapract.upgrade`, stone `3.1.repair.test.defects`
- the full diagnosis: `3.1.repair.test.defects.yield.md`, defect **D11**

=================== #631 🎙️ task - fix(fixer): the lambda-caller rewrite adopts the ancient ADDRESS and leaves the contemp DIALECT

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(fixer): the lambda-caller rewrite adopts the ancient ADDRESS and leaves the contemp DIALECT
**description**
# 🌙 dream: the lambda-caller rewrite adopts the ancient ADDRESS and leaves the contemp DIALECT

- kind  = reseed
- owner = `ehmpathy/declapract-typescript-ehmpathy`
- caught 2026-09-22

## .the cue that fired

11 integration tests across 8 suites failed, each with the same rejection from the remote peer:

```
✋ ConstraintError: BadRequestError: Errors on 1 properties were found while validating
   properties for lambda invocation event:
   [ { "message": "\"event\" is not allowed", "path": "event", "type": "object.unknown" } ]
```

the peer had been reached — it replied. it refused what we sent it.

## .the gap, precisely

the fix rewrites `simple-lambda-client`'s `invokeLambdaFunction` to `sdk-aws-lambda`'s
`askLambdaEndpoint`, and wires each call to `getOneAwsLambdaCallerContextAncient`.

🔴 **`ancient` is TWO orthogonal axes, and the fix takes only one.**

| axis | what it settles | where it is set |
|---|---|---|
| the **ADDRESS** | the slug the peer is published under — `dev` below prod | `context.env.access` |
| the **DIALECT** | the payload shape the peer accepts | `input.struct.payload` |

`askLambdaEndpoint` defaults `struct.payload` to `'contemp'`, which wraps the event as
`{ event, trail }`. an ancient peer runs `simple-lambda-handlers`, whose joi validator refuses an
unknown top-level key outright. ⇒ **every call addresses the right lambda and speaks to it in a
language it does not read.**

measured on `ahbode/svc-chat` @ `beav/feat-declapract-upgrade`: 4 peer sdks, 29 call sites, all
wired the same way — so this is the fix's shape, not one slipped edit.

## 🟡 .the asymmetry that makes the caller responsible

the receive side is already backwards-compatible; the send side is not.

- `genLambdaEndpoint` carries a `genTrailMiddleware` case named *"ancient caller payload (raw event,
  no trail wrapper)"* — a contemp handler takes either shape
- `getLambdaPayload` has no such branch. it always wraps

the asymmetry is deliberate: a contemp handler must serve ancient callers through a rollout. ⇒ which
is precisely why the **caller** must declare its dialect, and `struct.payload` is the sanctioned way
to say so. the rewrite never used it.

## .the shape of the fix

1. **emit the dialect beside the address.** wherever the fix writes
   `getOneAwsLambdaCallerContextAncient`, it must also write `struct: { payload: 'ancient' }` — or
   better, emit a bound helper so the two cannot be wired apart:

   ```ts
   export const askLambdaEndpointAncient = async <TRequest, TResponse>(
     input: Omit<AskLambdaEndpointInput<TRequest>, 'struct'>,
     context: …,
   ): Promise<TResponse> =>
     askLambdaEndpoint<TRequest, TResponse>({ ...input, struct: { payload: 'ancient' } }, context);
   ```

   🔴 **the helper is the better form, and not merely the tidier one.** two independent axes that
   must always agree is a defect the next peer sdk repeats; one bound name cannot be half-taken.

2. **clamp it** — a fixture that asserts an ancient-context call emits a bare event, never a
   `{ event, trail }` envelope. red under today's fix, green after step 1.

## .why it is not done in this round

- **safe?** no — it changes emitted content for every adopter of the lambda-client fix
- **clean?** no — the fix is upstream; the local `askLambdaEndpointAncient` bridge is what this
  round shipped, and the next `declapract apply` on a fresh repo re-emits the defect

## ⚠️ what is NOT established

whether `sdk-aws-lambda` would rather **derive** the dialect from the context than take it as a
second flag — i.e. whether an ancient context should default `struct.payload` to `'ancient'`. that
would close the gap at the library rather than at the practice, and it is the stronger fix if the
two axes are truly never independent. i did not establish that they are never independent.

## .provenance

- route  = `.route/v2026_09_18.declapract.upgrade`, stone `3.1.repair.test.defects`
- the full diagnosis: `3.1.repair.test.defects.yield.md`, defect **D16**
- peer dream from the same upgrade:
  `v2026_09_22.reseed.joi-uuid-translated-as-zod-uuid-is-narrower.md`
- related: `ehmpathy/sdk-aws-lambda#42` (the `EnvironmentAccessTier` return type, dispatched from
  this same route)

=================== #630 🎙️ task - fix(apply): declapract apply does not converge — a second run still reports changes

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(apply): declapract apply does not converge — a second run still reports changes
**description**
# 🌙 dream: declapract apply oscillates against biome, so it never converges

- kind  = reseed
- owner = `ehmpathy/declapract-typescript-ehmpathy`
- caught 2026-09-20

## .the cue that fired

a self review asked "did the upgrade converge?" — a question the stone's own guide does not reach,
since its check is `shell yeah!` = success. so i ran the full exec a **second** time to find out.

## .the gap, precisely

`declapract apply` never reaches a fixpoint. measured on `ahbode/svc-chat` @
`beav/feat-declapract-upgrade`, `declapract@0.13.27` + `declapract-typescript-ehmpathy@0.49.13`:

| pass | fixes applied | identical across two independent execs? |
|------|---------------|------------------------------------------|
| pass 1 | 10 files | ✔ same files, same practices, same order |
| pass 2 | 5 files | ✔ same files, same practices, same order |

a converged apply reports 0 fixes on pass 2. this is a stable 2-cycle.

### source 1 — biome and the templates disagree on format

the exec order is `declapract apply` ×2 → `git add .` → `pnpm fix`, so whatever biome rewrote after
the stage shows unstaged:

```
MM biome.jsonc
AM src/utils/database/getOneDatabaseConnection.ts
```

both diffs are **purely format-level** and oppose each other:

- `biome.jsonc` — declapract writes multi-line arrays; biome collapses them to
  `[":PACKAGE:", "!@src", "!@src/**"]`
- `getOneDatabaseConnection.ts` — declapract writes
  `export const getOneDatabaseConnection = async (): Promise<DatabaseConnection> => {` on one line;
  biome wraps it and re-indents the whole body

⇒ declapract writes the template → biome reformats it → declapract sees a diff and rewrites it.

🔴 **the sharpest instance: `biome.jsonc` is the file the `lint` practice itself ships, and it does
not satisfy the biome config it declares.** the practice's own artifact fails the practice.

### source 2 — two practices claim one file

four files are fixed by a **different practice** on pass 2 than on pass 1:

| file | pass 1 practice | pass 2 practice |
|------|-----------------|-----------------|
| `.husky/check.lockfile.sh` | `pnpm.bad-practice.husky-lockfile-check` | `husky.best-practice` |
| `config.schema.ts` | `persist-with-rds.best-practice` | `config.best-practice` |
| `getConfig.ts` | `typescript-any.bad-practice.relative-imports` | `config.best-practice` |
| `getOneDatabaseConnection.ts` | `persist-with-rds.best-practice` | `typescript-any...relative-imports` |

⇒ two practices each declare a different desired content for one file, independent of biome. this is
likely why the upgrade skill runs apply twice at all — the second pass papers over the first.

## .the shape of the fix

1. **format every `best-practice/**` template with the biome config the `lint` practice ships.**
   that closes source 1 at its root, and it is mechanizable: run biome over the template corpus as
   a build step, so a template cannot be published in a format its own config rejects.
2. **clamp it** — a test that asserts every emitted template is already biome-clean. it goes red
   under today's `biome.jsonc` and green after step 1.
3. **source 2 needs a decision, not a format pass** — either one practice owns each file, or the
   overlap is declared and ordered. the diagnostic worth adding: report when two practices fix one
   file in a single apply, rather than let the later one win in silence.
4. **the convergence clamp** — assert a second `apply` on a settled repo reports 0 fixes. that is
   the property a user assumes and does not hold today.

## .why it is not done in this round

- **safe?** no — it changes emitted content for every adopter of these practices
- **clean?** no — the fix is upstream; a local edit is reverted by the next `declapract apply`, and
  that was proven on this very route with the `#613` jsdoc defect

⇒ a legitimate defer, so it is caught here rather than half-done.

## ⚠️ what is NOT established

whether a CI lint or validate gate fails on the dirty tree apply leaves. i did not run CI and claim
neither way. it decides the severity — a dirty tree alone is a nuisance; a red gate is a blocker for
every adopter.

## .provenance

- route  = `.route/v2026_09_18.declapract.upgrade`, stone `1.upgrade.invoke`
- measured in the self review:
  `review/self/for.1.upgrade.invoke._.r1.has-completed-exec-successfully.md`
- peer dispatch from the same route: `ehmpathy/declapract-typescript-ehmpathy#613` (the
  self-terminated jsdoc, fixed in 0.49.13)

=================== #629 🎙️ task - fix(fixer): joi .uuid() to z.uuid() narrows the contract — z.guid() is the faithful equivalent

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(fixer): joi .uuid() to z.uuid() narrows the contract — z.guid() is the faithful equivalent
**description**
# 🌙 dream: the joi→zod fix translates `.uuid()` to `z.uuid()`, which is strictly narrower

- kind  = reseed
- owner = `ehmpathy/declapract-typescript-ehmpathy`
- caught 2026-09-22

## .the cue that fired

five acceptance suites failed after every other gate — types, lint, unit, integration — read green.
the rejection came from the handler's own validator against a payload the endpoint had accepted for
years.

## .the gap, precisely

the `joi-to-zod` fix rewrites `Joi.string().uuid()` as `z.uuid()`. **the two are not equivalent.**

| library | what a bare `.uuid()` enforces |
|---|---|
| joi | the 8-4-4-4-12 hex **layout only** |
| zod | the layout **plus** the version nibble and the variant nibble |

joi builds its regex from a `version` option. given none, `versionNumbers` is `''`, so both nibbles
fall back to `[0-9A-F]` — `joi/lib/types/string.js`:

```js
`…[${versionNumbers || '0-9A-F'}][0-9A-F]{3}\\2?[${versionNumbers ? '89AB' : '0-9A-F'}]…`
```

zod ships **both** regexes, and the fix takes the wrong one — `zod/v4/core/regexes.cjs`:

```js
exports.guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
// z.uuid() layers version + variant on top of that
```

⇒ **`z.guid()` is the faithful translation of a bare joi `.uuid()`. `z.uuid()` translates
`Joi.string().uuid({ version: [...] })`.**

measured on `ahbode/svc-chat` @ `beav/feat-declapract-upgrade`: 11 sites across 7 handlers, 5 of 12
acceptance suites red. the payload that tells them apart is
`'beefbeef-beef-beef-beef-beefbeefbeef'` — version nibble `b`, variant nibble `b`.

## 🔴 .why this one is worse than its peers

seven other partial fixes were measured on this same upgrade. **every one of them failed loud** — at
the type checker, or at the linter. this one **compiles**, passes lint, passes unit, passes
integration, and rejects live traffic.

⇒ a repo with no acceptance suite adopts this and ships a narrowed public contract with no signal at
all. the endpoints still take the uuids their own tests mint (which are v4) and refuse every id
minted before the convention, plus every non-v4 external id.

## .the shape of the fix

1. **translate `Joi.string().uuid()` → `z.guid()`** — the default case, and it is the common one
2. **translate `Joi.string().uuid({ version })` → `z.uuid()`** (or `z.uuidv4()` where the version
   set is a single v4) — the only case that earns the stricter form
3. **clamp it** — a fixture whose payload carries a non-v4 uuid (`beefbeef-…`), asserted to pass
   both the joi input and the zod output. it goes red under today's fix and green after step 1

🟡 **the general claim worth a line in the practice**: a `fix` that translates a validator library
must translate its **semantics**, never merely its method names. the same class of defect is latent
in every other joi method the fix maps — `.isoDate()`, `.email()`, `.uri()` each have a stricter or
looser zod counterpart, and only `.isoDate()` has been checked (it was a fulcrum on this route).

## .why it is not done in this round

- **safe?** no — it changes emitted content for every adopter of the joi-to-zod fix
- **clean?** no — the fix is upstream; the local `z.guid()` repair is what this round shipped, and
  the next `declapract apply` on a fresh repo re-emits the defect

## ⚠️ what is NOT established

whether the practice intends the stricter form — i.e. whether `z.uuid()` was chosen deliberately to
tighten the contract rather than as a naive map. i found no note that says so, and the
`@declapract:review` marker the fix stamps names three decisions (optionality, unknown-key policy,
date coercion) and **not** uuid strictness. that absence is the evidence, and it is not proof.

## .provenance

- route  = `.route/v2026_09_18.declapract.upgrade`, stone `3.1.repair.test.defects`
- the full diagnosis: `3.1.repair.test.defects.yield.md`, defect **D17**
- peer dream from the same fix family:
  `v2026_09_22.reseed.ask-lambda-endpoint-rewrite-omits-struct-payload.md`

=================== #628 🎙️ task - fix(lint:cycles): bound the exclude policy to type-only cycles — a third-party require cycle is a different class

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(lint:cycles): bound the exclude policy to type-only cycles — a third-party require cycle is a different class
**description**
## .what

the `exclude: []` policy is declared as universal. its **rationale** covers one class of cycle, and
a second class exists that the rationale does not reach.

⇒ the ask is to **bound the policy to the class it was proven on**, and say what an adopter outside
that class should do.

## .the two classes

| class | what it is | does `--transform` erase it? |
|---|---|---|
| **type-only import cycles** | a cycle that exists only in the type graph | ✅ yes — the rationale's case |
| **genuine `require` cycles in third-party JS** | a real runtime cycle inside a dependency | 🔴 **no** — no transform can erase it |

the empty-exclude policy is correct for the first class: a type-only cycle *should* vanish under
`--transform`, so an exclude entry for one is a mask over a defect.

it is not correct for the second. `ahbode/svc-chat` measures **160 cycles** at this commit, all of
them `require` cycles inside third-party JS. they are not ours to fix, they do not vanish under any
flag, and an empty exclude list makes the gate report them every run.

## .the cost

a gate that reports 160 findings an adopter cannot act on is a gate that gets silenced rather than
read. that is the failure mode the policy exists to prevent, reached by the other road.

## .the evidence

`ahbode/svc-chat` `.behavior/v2026_06_10.fix-cyclecheck/` carries the substitution and its `n/a`
verification — the prior round where this repo reached the same wall and worked around it.

## .the ask

1. state the policy's **scope**: `exclude: []` is the default because type-only cycles must not be
   masked
2. state the **carve-out**: a third-party `require` cycle is a different animal, and name what an
   adopter does with one — an exclude entry with a cited reason, or an upstream dispatch, or both
3. this **reconciles `#581` (closed) with `#616` (open)** — `#616`'s own text notes that the shipped
   `.dpdmrc.yaml` declares `exclude: []` and that the policy is "unaffected" by its fix. that is
   true of its fix and leaves this question open

## .see also

- `#581` — the row that named the empty-list policy
- `#616` — the `// "^$"` dead-syntax half, open, and explicitly orthogonal to this
- found by `ahbode/svc-chat` route `v2026_09_18.declapract.upgrade`, entry D14

=================== #627 🎙️ task - fix(persist-with-rds): withDatabaseTransaction declares Promise<Awaited<R>>, unreachable from its own body

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(persist-with-rds): withDatabaseTransaction declares Promise<Awaited<R>>, unreachable from its own body
**description**
# 🌙 dream: `withDatabaseTransaction` declares `Promise<Awaited<R>>`, which no body can satisfy

- kind  = reseed
- owner = `ehmpathy/declapract-typescript-ehmpathy`
- caught 2026-09-22

## .the cue that fired

a variance error inside `withDatabaseTransaction.ts` itself, on a file whose bytes are **identical
to the practice's**. `git diff origin/main` showed the upgrade had rewritten it wholesale, so the
defect arrived with the template rather than with a local edit.

## .the gap, precisely

`practices/persist-with-rds/best-practice/src/utils/database/withDatabaseTransaction.ts` declares:

```ts
): Promise<Awaited<R>> => { … const result = await logic(input, { ...context, dbConnection }); … }
```

for an **unconstrained** `R`, typescript skips the `Awaited<>` unwrap: the rule applies when the
awaited operand's apparent type has a callable `then`, and an unconstrained `R`'s apparent type is
the empty object. so `await logic(...)` types as plain `R`, and **`R` is not assignable to
`Awaited<R>`**.

⇒ the declared return is unreachable from its own body, for every caller that does not pin `R`.

measured on `ahbode/svc-chat` @ `beav/feat-declapract-upgrade` with `typescript@5.x`,
`declapract-typescript-ehmpathy@0.49.13`.

## .the shape of the fix

`Promise<R>` — not `Promise<Awaited<R>>`.

`R` is already the resolved value. the logic parameter is typed `(…) => R | Promise<R>`, so ts
infers `R` from the `Promise<R>` arm of that union — the same shape `Promise.then` hands its
callback. the `Awaited<>` wrap is defensive against a case the union already excludes.

🟡 **it is one token, and the clamp is free**: the type check itself is the clamp. the practice's own
`npm run test:types` over a repo that composes the wrapper goes red today.

## .why it is not done in this round

- **safe?** yes, locally — the repo now carries `Promise<R>` with a `.note` that records the divergence
- **clean?** no, upstream — the next `declapract apply` re-emits the template and reverts the token

⇒ so the local repair is a patch that a future apply undoes. **that is the reason this is caught
rather than closed**: the fix belongs where the template lives.

## ⚠️ what is NOT established

whether a `R extends unknown` or a `Promise<Awaited<R>>`-with-cast form was intended for some caller
i did not see. i found no caller in this repo that pins `R` such that the wrap carries weight, and
i did not survey the practice's other adopters.

## .provenance

- route  = `.route/v2026_09_18.declapract.upgrade`, stone `3.1.repair.test.defects`
- the full diagnosis: `3.1.repair.test.defects.yield.md`, defect **D10**, cause 2
- peer dream from the same practice:
  `v2026_09_22.repair.migrate-the-13-residual-with-database-connection-sites.md`

=================== #626 🎙️ task - fix(persist-with-rds): with-connection-in-input is an EXISTS check with no fix, so the upgrade breaks the build

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(persist-with-rds): with-connection-in-input is an EXISTS check with no fix, so the upgrade breaks the build
**description**
## .what

`with-connection-in-input` is an **`EXISTS`** check that ships **no `fix`**. its readme names the
replacement, and no mechanism ever surfaces that name to the adopter.

⇒ the adopter gets a red check, no automated repair, and a replacement they must go read a practice
readme to discover.

## .why this is worse than the `CONTAINS` case

`#571` row **D39** already names the shape for `CONTAINS` checks — a declared file with a shipped
`fix` left unapplied. this extends it to `EXISTS`, where the cost is categorically higher:

| check kind | what a miss costs the adopter |
|---|---|
| `CONTAINS` | a **drift** — the tree diverges from the practice, and the code still runs |
| `EXISTS` | a 🔴 **compile break** — the symbol is gone, and the tree does not build |

so the `EXISTS` case is the one that stops an upgrade dead, and it is the one with no fix attached.

## .measured

`ahbode/svc-chat` @ `0.49.13`. the upgrade removed the extant API; 13 call sites were left on the
removed symbol. the replacement is named only in the practice's own readme, which no part of the
upgrade output points at.

## .the fix, in order of value

1. **ship a `fix`** for the `EXISTS` check, where the replacement is mechanical
2. where it is not mechanical, have the check's failure **print the readme's replacement line**. a
   check that knows the answer and does not say it is the ergonomic defect here
3. audit the other `EXISTS` checks for the same shape — this is unlikely to be the only one

## .see also

- `#571` row **D39** — the `CONTAINS` half of this
- found by `ahbode/svc-chat` route `v2026_09_18.declapract.upgrade`, entry D10a

=================== #625 🎙️ task - fix(cache): a family floor names 2 of 4 members, and .ifInstalled() makes the gap unCHECKable

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(cache): a family floor names 2 of 4 members, and .ifInstalled() makes the gap unCHECKable
**description**
## .what

`src/practices/cache/best-practice/package.json` declares a floor for **2** members of a 4-member
package family. the other two get no floor — and because the check is `.ifInstalled()`, their
absence reads as **unCHECKable** rather than as **failed**.

⇒ a repo can install all four, sit below the floor on two of them, and `plan` reports green.

## .the mechanism

`.ifInstalled()` is the right primitive — a floor should not fire on a package a repo does not use.
but it makes a **declaration gap** and a **legitimate non-use** indistinguishable:

| the repo | what `plan` says | what is true |
|---|---|---|
| does not use member C | green | correct |
| uses member C, below the floor, C undeclared | green | 🔴 the floor was never applied |

the check cannot tell those apart, because the declaration is what it looks up and the declaration
is what is absent.

## .the fix, either half

1. **declare all four.** the cheap fix, and it closes this instance
2. **report the gap.** where a practice declares a floor for a family, have `plan` name the members
   it holds no floor for. that fixes the class rather than the instance

⇒ (2) is the one worth the round. (1) will drift again the next time the family grows a member, and
it will drift silently for exactly the same reason.

## .see also

- found by `ahbode/svc-chat` route `v2026_09_18.declapract.upgrade`, entry D6

=================== #624 🎙️ task - fix(check): the zod minVersion check reads dependencies, but pnpm resolves pnpm.overrides

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
fix(check): the zod minVersion check reads dependencies, but pnpm resolves pnpm.overrides
**description**
## .what

the zod `minVersion` check reads `dependencies`. pnpm resolves `pnpm.overrides`. so `plan` reads
green on a tree that sits below **both** declared floors.

measured on `ahbode/svc-chat` @ `declapract-typescript-ehmpathy@0.49.13`:

| source | what it declares | what it means |
|---|---|---|
| `package.json` `dependencies.zod` | `4.0.0` | what the check reads |
| `package.json` `pnpm.overrides.zod` | `3.23.8` | what pnpm actually installs |
| on disk | **`3.23.8`** | what the code runs against |

⇒ the check passed. the tree was below the floor the check exists to enforce.

## .the second half — the two floors disagree with each other

two practices declare a zod floor, and they do not agree:

| practice | declares |
|---|---|
| `config` | `4.0.0` |
| `runtime-schemas` | `3.24.0` |

a repo cannot satisfy both with one resolution unless the floors are reconciled. so even a check
that read the right key would have an ambiguous target.

## .the fix

1. the `minVersion` check must read the key **the package manager reads** — `pnpm.overrides` where
   present, with `dependencies` as the fallback. an override that lowers a floor is the case that
   matters, and it is invisible today
2. reconcile the two declared floors, or declare which one wins

## .why it is quiet

an override is usually added to settle a version contention, by someone who does not have a practice
floor in mind. the check that should catch the regression reads a key the override supersedes — so
the louder the reason for the override, the more likely the floor is silently lost.

## .see also

- `#545` — emits `pnpm.overrides.zod` single-identity. this amends it: the *emitter* writes the
  override, and the *checker* does not read it back
- found by `ahbode/svc-chat` route `v2026_09_18.declapract.upgrade`, entry D5′

=================== #623 🎙️ task - perf(jest): source keyrack once per run in globalSetup, not per suite file (~25s each)

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
perf(jest): source keyrack once per run in globalSetup, not per suite file (~25s each)
**description**
## .what

`jest.integration.env.ts` and `jest.acceptance.env.ts` call `keyrack.source(...)` from `setupFilesAfterEnv`, which jest runs once PER SUITE FILE. `keyrack.source` spawns a full `rhx keyrack get --for repo --json` child each time.

## .measured (ehmpathy/rhachet @ beav/feat-boot-briefs-into-claude-md, 2026-09-24, loaded box)

| step | wall |
|---|---|
| `import { keyrack } from 'rhachet/keyrack'` | ~6.5s (2163 module loads) |
| `keyrack.source(...)` | ~18.7s (cpu ~0.3s — a child cli + daemon round trip) |

so each suite file paid ~25s before its first test. a one-file acceptance run fell from 129s to 62s once moved; a full sweep of rhachet's 111 acceptance files saves ~45 min.

## .the shape of the fix

- new `jest.integration.globalSetup.ts` / `jest.acceptance.globalSetup.ts`:
  ```ts
  export default async (): Promise<void> => {
    const { keyrack } = await import('rhachet/keyrack');
    keyrack.source({ env: 'test', owner: 'ehmpath' }); // lenient for acceptance
  };
  ```
- configs: `globalSetup: './jest.<tier>.globalSetup.ts'` beside the extant `setupFilesAfterEnv`
- drop the `keyrack` import + `keyrack.source` call from `jest.<tier>.env.ts`
- the env it sets reaches every suite: in-band suites share the parent process, and forked workers inherit its env

## .reference

ehmpathy/rhachet `jest.*.globalSetup.ts` @ beav/feat-boot-briefs-into-claude-md.

=================== #622 🎙️ task - feat(build): build only when stale before local acceptance tests

🦫🎙️   dispatch to foreman
```
💧 task enqueued
   ├─ priority = ?
   ├─ yieldage = ?
   └─ leverage = ?
```
**title**
feat(build): build only when stale before local acceptance tests
**description**
# build only when stale, before local acceptance tests

## .the cue

on `ehmpathy/rhachet` @ `beav/feat-boot-briefs-into-claude-md`, one scoped acceptance run took
616s, and ~200s of it was the `npm run build` inside `test:acceptance:locally`: `build:clean`
wipes `dist/` and the bun `.bc` files, then `tsc` and both `bun build --compile` rerun from zero —
on every run, even when no source file changed. on one run the build alone took ~8 min.

## .the gap

the declapract template's `test:acceptance:locally` (and `test:acceptance`) always run a full
clean `npm run build`. a local red-green loop on one acceptance file pays the whole build each
iteration.

## .the shape of the fix

```jsonc
"build:complete": "echo '{ \"type\": \"commonjs\" }' > ./dist/package.json && touch ./dist/.build.stamp",
"build:ifstale": "[ -f ./dist/.build.stamp ] && [ -z \"$(find src package.json pnpm-lock.yaml tsconfig.json tsconfig.build.json -newer ./dist/.build.stamp -print -quit)\" ] && echo '👌 dist is fresh, build skipped' || npm run build",
"test:acceptance:locally": "npm run build:ifstale && LOCALLY=true jest -c ./jest.acceptance.config.ts ..."
```

- the stamp is written last, so an interrupted build leaves no stamp and the next run rebuilds
- any input newer than the stamp (a src edit, a checkout, a dep bump) forces the full build
- repos with extra build inputs (e.g. `bin/run*` entrypoints) add them to the `find` list
- keep `test:acceptance` (ci) on the full `npm run build`; ci starts clean anyway

## .why upstream

every repo on the typescript practice carries the same script, so every repo pays the same
per-run build tax on local acceptance loops.