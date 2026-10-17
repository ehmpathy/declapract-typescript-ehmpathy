# research — lambda / sdk cluster (#646, #650, #640, #631, #635)

## upstream facts
- sdk-aws-lambda npm latest = 0.7.0 (2026-09-27). main = the 0.7.0 release commit `1495d64`; no branches/PRs past it.
- 0.7.0 ships `{ payload, headers, event }` (PR #46, `rawEvent` gone), forAsk / forApiGateway / forSqs, `FrozenDeep`; `runLambdaEndpoint` / `asLambdaEvent` since 0.5.0.
- upstream open: #48 (FrozenDeep primitive bug — the 0.7.1 fix), #51 (apigateway default framing 500s), #58 (derive framing from source; excludes ask-peer), #42 (widen caller-context access to `dev`), #40 (stale, work shipped), #49 (readme says `body`).
- 0.7.1 fix shape: primitive guard at top of `FrozenDeep` in `src/domain.operations/genLambdaEndpoint/setEventFrozen.ts:17-23` + a clamp that `{ at: IsoTimeStamp }` stays assignable; `fix(types)` → release-please 0.7.1.
- visualogic 1.3.3: `withLogTrail` is `(input, context)`, needs `context.log`, logs errors at `${name}.error`, `duration.threshold` is a duration object `{ seconds: 1 }`, throws at load on an unnamed fn.

## #646 — adopt sdk-aws-lambda 0.7.1
- now: `node-service/best-practice/package.json:4` floor 0.4.0; handler fix emits bare `genLambdaEndpoint(` (`simple-lambda-handlers/src/**/*.ts.declapract.ts:65-66,113`) and `.for.apiGateway` (:114); fallbacks `'^0.1.0'` in `simple-lambda-handlers/package.json.declapract.ts:20`, `simple-lambda-client/package.json.declapract.ts:20`. no bad-practice for adopters on 0.4–0.6.
- fix: upstream 0.7.1 (above). here: floor `minVersion('0.7.1')`; handler fix emits `.forAsk(` / `.forApiGateway(` and `({ payload }, { log })`; fallbacks → exact `'0.7.1'`; new `node-service/bad-practices/sdk-aws-lambda-pre-0.7/` (src check keys on bare `genLambdaEndpoint(` or `.for.apiGateway(`; rewrites `invoke: async ({ event })` → `({ payload })` + body uses, only in matched files; drops `@types/aws-lambda` only if no `aws-lambda` import; marks `extractTaskParcelFromSqsEvent` for review); readme: readonly sinks.
- decision: ship 0.7.1 upstream first, floor 0.7.1 (85%) — dates-and-times mandates iso-time branded primitives, which fail tsc under 0.7.0's FrozenDeep.
- tests: unit per rewrite; integration on a demo 0.6 handler repo w/ snapshots; twice-apply no-op.
- risk: `{event}`→`{payload}` wrong for a handler that wants the raw envelope — gated on pre-0.7 call forms.

## #650 — tests-service drops simple-lambda-testing-methods
- now: `tests-service/best-practice/package.json:3` requires it (0.5.1); acceptance check `blackbox/lambdas/*.acceptance.test.ts.declapract.ts:27-30` demands its import (re-flags migrated repos); three `tests-any/bad-practices/old-acceptance-test-utils*` fixes rewrite INTO it (e.g. `…/*.ts.declapract.ts:22`); `nonpublished-modules/…/ahbode-standard-lambda-handler/…integration.test.ts.declapract.ts:11` emits `invokeHandlerForTesting`; `tests-node/best-practice/src/.test/useKeyrack.ts:33-34,85-121,152-208` carries aws-sdk v2 workarounds.
- fix: drop the dep; acceptance check expects `import { asLambdaEvent, runLambdaEndpoint } from 'sdk-aws-lambda'` (`locally`→`at`); new `tests-service/bad-practices/simple-lambda-testing-methods/` (src + package.json): `invokeLambdaForTesting`→`runLambdaEndpoint.onSerialized`, `invokeHandlerForTesting`→`.onReferenced`, `createExampleAPIGatewayEvent`→`asLambdaEvent.fromApiGateway` (no struct, at the 0.7.2 floor; each 400 read in a moved file nests to `error.message`/`error.class`, http reads stay flat, a mixed file gets a marker — F39), review marker where `getError(...)` asserts (onReferenced returns a fault as a value; onSerialized throws); retarget the three old-acceptance fixes + the ahbode emit; retire v2 workarounds in useKeyrack only once no v2 caller remains (gate on dep presence).
- decision: migrate now, explicit `'ancient'` framing on apigateway calls (80%).
- risk: medium — v2 workaround removal breaks a repo that still has a v2 caller; gate it.

## #640 — guide teaches rawEvent
- now: `rawEvent` in `simple-lambda-handlers/.declapract.readme.md:28,33,35` (and `genLambdaEndpoint(`/`.for.apiGateway` at :20-21,56,58), fix markers `*.ts.declapract.ts:21,30-31,45`, test `*.ts.declapract.test.ts:60,69,98-121`, snapshot `src/**/__snapshots__/*.snap:3-31`; check `simple-lambda-handlers/__snapshots__/.declapract.integration.test.ts.snap`.
- precondition met: 0.7.0 ships the shape.
- fix: with #646 — teach `invoke: async ({ headers, payload, event }, context)`, `forAsk`/`forApiGateway`, pin 0.7.1; re-snapshot (90%).

## #631 — lambda-caller rewrite: ancient address, contemp framing
- now: rename-only rewrite `simple-lambda-client/src/**/*.ts.declapract.ts:28-41` (`invokeLambdaFunction`→`askLambdaEndpoint`); readme :23-28,48-54; `getOneAwsLambdaCallerContextAncient` emitted nowhere; address helper at `environments/best-practice/src/access/sdks/sdkAwsLambdaEnvAccessAncient.ts:27-32`; no framing counterpart. upstream `askLambdaEndpoint.ts:74` defaults payload `'contemp'`; #58 will not cover ask-peer.
- fix: emit `environments/best-practice/src/access/sdks/sdkAwsLambdaAskAncient.ts` binding `struct: { payload: 'ancient' }` + `env: { access: sdkAwsLambdaEnvAccessAncient() }` (converges with #636's exact return type); `simple-lambda-client` fix rewrites to that helper; readme. upstream #42 needed for a cast-free context.
- decision: bind at the practice, not the sdk (75%) — ancient framing is accepted by every handler, so the bind is always safe; only the trace id is lost.
- tests: clamp that the helper sends a bare event, never `{ event, trail }` (red without `struct`); fix test; idempotent (file no longer imports simple-lambda-client).

## #635 — vendored withLogTrail fork
- now: no detector; visualogic only in `commands/best-practice/package.json:3` (1.3.3).
- fix: new `logs/bad-practices/vendored-log-trail/src/**/*.ts.declapract.ts` — detect the fork's byte-identical todo `hookup visual tracing w/ external lib` in a file with no `visualogic` import, or an export `withInputOutputTracing`; fix prepends one shared `@declapract:review` marker naming `(input, context)`, `withLogTrail(_fn, { name })`, `context.log`, `duration: { threshold: { seconds: N } }`, the stacked `withDatabaseContext` form; check skips marked files. reuse the marker text with #626.
- decision: detect + mark, no rewrite (70%); home `logs` (60%) vs `commands`.
- note: visualogic 1.3.3 types transitively pull simple-leveled-log-methods + @ehmpathy/uni-time (transitive only; no adopter depcheck hit).
