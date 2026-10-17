# S21 — sdk-aws-lambda 0.7.2 is published; the node-service floor moves to it

## .said

> also, sdk-aws-lambda got released

## .settled

- sdk-aws-lambda 0.7.2 ships the api gateway contemp-call fix (sdk-aws-lambda#70, fixes #51): a
  contemp call to an api gateway endpoint answers rather than 500s. every node-service adopter
  wants it, so the declared floor moves from 0.7.1 to 0.7.2.
- its one break — `genTrailMiddleware()` now requires `{ carrier }` — reaches no template here and
  no caller in `ehmpathy/*` or `ahbode/*` (a repo-wide search found only notes), so the bump is safe.
- the patch floors move with it: a 0.7.1 patch on a repo bumped to 0.7.2 names a version the
  lockfile no longer holds, the #670 install refusal.
- sdk-aws-lambda#42 is still open, so #631 keeps its one documented cast.
- the 0.7.1 named in a jsdoc or a review marker stays: it names where the contract shape shipped.

## .landed

- `node-service/best-practice/package.json` — `minVersion('0.7.2')`
- the floor in `sdk-aws-lambda-pre-v07` (package.json, pnpm-workspace.yaml, patches),
  `simple-lambda-client`, `simple-lambda-handlers`, `tests-service/simple-lambda-testing-methods`
- a boundary clamp: a 0.7.1 patch is now detected and deleted
- the pin assertions in the unit and integration tests
