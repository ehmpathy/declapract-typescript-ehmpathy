# S1 — no terraform fmt

## .said

> we don't want terraform fmt. we want to rip terraform out soon, so there's no reason for it

## .settled

terraform is on its way out of the practice set, so no practice runs `terraform fmt`. the
formatter set is biome alone. #645 is fixed by removal: the `*:format:terraform` scripts leave
the practice, and the `fix:format` / `test:format` chains no longer invoke them — no skip, no
binary check.

## .landed

- `1.vision.experience.case=_.md` row 645
- `1.vision.yield.md` edgecases + open questions
- `.fulcrums/inventory.of=fulcrums.case=F2-*.md` verdict
