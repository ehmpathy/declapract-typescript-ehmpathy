# F7 — #646: ship sdk-aws-lambda 0.7.1 upstream first, floor at 0.7.1

- **fork:** floor at the published 0.7.0 now, or publish 0.7.1 (the FrozenDeep primitive guard,
  sdk-aws-lambda#48) first and floor there.
- **taken:** 0.7.1 first. dates-and-times mandates branded iso-time primitives, and 0.7.0's
  `FrozenDeep` maps a branded string into an object shape, so a handler that returns an
  `IsoTimeStamp` fails tsc under 0.7.0 — a floor at 0.7.0 would ship a B1 defect.
- **rework:** clean — the floor is one string; the upstream fix is a `fix(types)` patch.
- **confidence 85%, low because:** the upstream release is a cross-repo step this route performs;
  if it stalls, this repo's release waits on it.
- **where:** upstream `sdk-aws-lambda/src/domain.operations/genLambdaEndpoint/setEventFrozen.ts:17-23`;
  here `node-service/best-practice/package.json:4` + the new `sdk-aws-lambda-pre-0.7` bad-practice.
- **verdict:** superseded by the wisher (seed S5) — no release is published in another repo this
  round; #646 is held until 0.7.1 exists (F33).
