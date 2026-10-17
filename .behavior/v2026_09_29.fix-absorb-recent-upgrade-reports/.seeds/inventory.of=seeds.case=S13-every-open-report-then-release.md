# S13 — every open upgrade report, then a release

## .said

> from the human, via the director: pull in the latest issues again — every open upgrade report on declapract-typescript-ehmpathy, up to the newest. please also confirm #650 (the practice mandates simple-lambda-testing-methods; the human wants that lib retired in favor of sdk-aws-lambda and its repo archived) and #666 are in scope. this tree gates the next wave of upgrades (svc-protools, svc-service-providers), so the goal after the pull is a release.

## .settled

- the round's scope is every OPEN upgrade report on this repo, not only the dated window — the
  older open reports (#487–#599) join triage on the same contract (S2: no deferral for size).
- `simple-lambda-testing-methods` is retired from every practice in favor of `sdk-aws-lambda`
  (#650 drops the dep and rewrites the acceptance calls; #666 bans its import).
- the archive of the `simple-lambda-testing-methods` repo is an act in another repo — held by S5
  for the human.
- the round ends in a release: this tree gates svc-protools and svc-service-providers.

## .landed

- `1.vision.experience.case=_.md` (rows 650, 666 confirmed D1, crit)
- `refs/research.dispatches-open-before-window.md`
