# F102 — 5.3 peer: each extant-test expectation change traces to the issue that required it

## .the fork

`mech-test-intent-slice-nz` (r030, 4 blockers) and `mech-test-intent-slice-rds` (r031, 3 blockers)
flag extant tests whose expected values changed under `rule.forbid.test-intent-violations`. the rule
asks: did the expectation change to match broken output, or did the requirement change, documented?

- concede: revert each expectation
- dispute: cite, per point, the requirement that changed and where it is documented

## .taken — dispute, per point

| lane · point | the change | the requirement, and its record |
|---|---|---|
| nz · blocker.1 | D52 clamp `[case3][t0]`: the retired `simple-lambda-testing-methods` import now passes the best-practice check | #650 retired that lib: the template emits `sdk-aws-lambda`, and the `tests-service/bad-practices/simple-lambda-testing-methods` fix rewrites the old import. a best-practice check that still demanded the retired import would throw on every adopter before its bad-practice fix could run (#607: no fixless throw). record: `refs/research.lambda.md`, vision case=10, `release.commits.md` |
| nz · blocker.2 | `[case5] an empty file` moved out of the unit clamp | #679: presence now reads the repo tree (a `._.acpt.test.ts` seam counts), so `check(null)` needs a real dir. `tests-any/test-kind-seam.declapract.integration.test.ts` covers the lambda declaration in both directions — a seam repo passes, an empty `blackbox/lambdas/` throws, `toContain('blackbox/lambdas')` + `toMatchSnapshot()` |
| nz · blocker.3 | rhachet `1.47.5` → `1.49.2` | #689 raised the practice's rhachet floor to 1.49.2 (rhachet honors `not:` in boot.yml from 1.49.0; 1.48.0 drops it silently); the fixture's version is the floor the apply writes, so the fixture had no reason to change. record: F62, vision case=2, `refs/research.dispatches-681-690.md` |
| nz · blocker.4 | the `invokeLambdaForTesting is absent` snapshot dropped | same requirement as blocker.1: that message demanded a retired import. the still-required import gate keeps a snapshot (`[case3][t1] throws when \`locally\` is absent`: `toContain('Expected imports')` + `toMatchSnapshot()`); a pass path emits no message to snap |
| rds · blocker.1 | `config/prep.json` keeps `__CHANG3_ME__` at each password | #683: prep users are created with that placeholder by `provision/schema/deploy.database.sh`, so a rewrite to `$.at(aws::param)` broke prep. record: F58, vision case=12 (`[case6]`), `refs/research.dispatches-681-690.md` |
| rds · blocker.2 | D55 clamp expects `@src/utils/config/getConfig` | the rds template `src/utils/database/getOneDatabaseConnection.ts` is a file this PR adds (`git diff main --stat`: 119 insertions) and imports `getConfig` by the alias; the clamp asserts what the template emits |
| rds · blocker.3 | `getAllParameters({ accessSlug: null })` → `({ choice: null })` | the parameters issue's own diff renames the argument (`refs/issues.622-652.md`: `getResources` passes `{ choice: null }`); `refs/research.rds.md` names this exact test line as owed the rework |

no expectation changed to match broken output: each tracks a requirement this PR was asked to land,
and each new expectation is itself clamped by a test that goes red if the requirement regresses.

## .rework

clean — any single point the council overrules is a one-file revert plus its snap.

## .confidence

90% — each row cites a file on disk; the lowest is nz · blocker.2, where the clamp moved files.

## .verdict

open, for the council.
