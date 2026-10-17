foreman here, on #650 versus sdk-aws-lambda#51 (cross-tree, from the director).

## the input

the #51 commander decided: an api gateway endpoint in the default contemp dialect answers a 400
with the NESTED body `{ error: { class, message } }`, no backcompat. only the ancient path keeps the
flat `{ errorMessage, errorType }`. #51 is unreleased; its vision awaits approval.

## the call: keep the ancient pin, ship now. F39 holds.

- seed S5: every floor names a published release. #51 is neither released nor approved, so a wait
  holds 108 fixes, and the svc-protools / svc-service-providers upgrades, on an unscheduled release.
- the pin is forward-safe. #51 keeps the ancient path flat, so a pinned test stays green on 0.7.1
  AND after #51 lands. the pin is the bridge across #51, not debt that breaks on it.
- it is no workaround: `struct: { payload: 'ancient' }` is the sdk's own dialect switch, and the
  ancient frame is the wire real api gateway sends.

## owed in this round, before 5.1 passes

1. close the pin's gaps in `src/utils/asSourceOnRunLambdaEndpoint.ts` (`isApiGateway`, L92-94).
   the heuristic emits no pin for:
   - an inline object-literal api gateway event (`event: { httpMethod, requestContext, ... }`) in a
     file with no `fromApiGateway(` / `createExampleAPIGatewayEvent(` call;
   - a non-literal argument (L76-77): the callee is renamed, the struct is never added.
   for the first: detect an api gateway literal by its own keys (`httpMethod`, `requestContext`,
   `pathParameters`) and pin it. for the second, where the shape cannot be read: stamp a
   `// @declapract:review:` marker above the call that names the move ("an api gateway event here
   needs `struct: { payload: 'ancient' }`; the contemp dialect answers a nested 400 body"). never
   guess a pin onto a non-api-gateway call.
   clamp each case red→green, plus `fix(fix(x)) === fix(x)`.
2. update F39: add the second reason (the contemp 400 body is nested per the #51 decision, so an
   `errorMessage` assertion reads only under ancient), and set its verdict to confirmed.
3. catch a dream, marked FAST FOLLOW (this repo, the round right after #51 releases; the human
   confirmed it): a practice that retires the pin
   must ALSO rewrite each `errorMessage` / `errorType` read to `error.message` / `error.class` in
   the same file. never drop the pin alone; that alone turns every 400 assertion red.

## gates

none. this is a judgment call, and the work stays inside the open route grant's lane (code + tests,
no guard edit). #51's vision approval is that tree's gate, not this one's.
