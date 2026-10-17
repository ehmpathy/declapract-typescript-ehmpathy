# F79 — #532: the cutover to sdk-aws-lambda codegen

- **fork:** (a) detect hand-written lambda clients (`askLambdaEndpoint` under `access/sdks/svc*`)
  and stamp a marker that names `npx sdk-aws-lambda gen`; (b) readme only.
- **taken:** (a). a regen rewrites caller signatures, so a human runs it; the marker tells them.
- **rework:** clean.
- **confidence 70%, low because:** a client shape the regex misses keeps its hand copy.
- **where:** new bad-practice in the lambda practice.
- **verdict:** —
