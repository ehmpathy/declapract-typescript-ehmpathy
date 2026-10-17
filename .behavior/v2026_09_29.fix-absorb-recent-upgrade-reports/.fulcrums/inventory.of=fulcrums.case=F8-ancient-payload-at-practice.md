# F8 — #631: bind the ancient payload struct at the practice

- **fork:** emit a practice helper `sdkAwsLambdaAskAncient` that binds `struct: { payload: 'ancient' }`
  plus the ancient address, or wait for sdk-aws-lambda to derive the payload struct from context
  (upstream #58, which excludes ask-peer).
- **taken:** the practice helper. every handler accepts the ancient struct, so the bind is always
  safe; only the trace id is lost on those calls.
- **rework:** clean — once the sdk derives it, the helper's body shrinks to a re-export.
- **confidence 75%, low because:** a cast-free context type needs upstream sdk-aws-lambda#42 (widen
  caller-context access to `dev`); until it lands the helper carries one documented cast.
- **where:** `environments/best-practice/src/access/sdks/sdkAwsLambdaAskAncient.ts` (new);
  `node-service/bad-practices/simple-lambda-client/src/**/*.ts.declapract.ts`.
- **verdict:** held with the lambda cluster (seed S5, F33); the shape stands for when 0.7.1 publishes.
