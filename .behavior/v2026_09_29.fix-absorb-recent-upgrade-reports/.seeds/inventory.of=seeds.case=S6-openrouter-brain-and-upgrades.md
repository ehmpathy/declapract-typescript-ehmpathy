# S6 — review on openrouter, and upgrade openrouter and sdk-aws-lambda

## .said

> hey lets cutover to rhachet-brains-openrouter instead . install latest and use 'openrouter/deepseek/flash' as the brain

> rhx upgrade openrouter and sdk-aws-lambda too btw

## .settled

- the route's peer reviews run on `openrouter/deepseek/flash`, via `rhachet-brains-openrouter` at its
  latest release (0.1.3).
- `sdk-aws-lambda` is upgraded to its latest release, 0.7.1, which now exists and carries the
  `FrozenDeep` branded-primitive fix (sdk-aws-lambda PR #62). under S5's "only pull in what is
  already done", the lambda cluster's only hold has lifted: #646, #650, #640, #631 land at a 0.7.1
  floor. #631 keeps its one documented cast, since sdk-aws-lambda#42 is not yet released.

## .landed

- `package.json` devDeps: `rhachet-brains-openrouter@0.1.3`
- the route guards: `--brain openrouter/deepseek/flash` on every peer review
- the lambda cluster: D2 → D1 in the inventory; case=8 restored from `archive/`; F33 verdict
