# F11 — self-apply only the files this repo already kept in step with the practice

## .the fork
- A: self-apply every file this round touched (workflows, jest configs, hooks, depcheck), so this repo carries the new output everywhere
- B: self-apply the files this repo already tracked the practice on (husky hooks + lock, `.depcheckrc.yml`, `.gitignore`), and leave the workflows and jest configs at HEAD

## .taken
B. this repo's `.test.yml`, `.install.yml`, `test.yml`, `provision.yml`, and jest configs predate several practice versions: the apply rewrote 300+ lines of `.test.yml` (shard jobs), dropped `--ignore-scripts` from install, pointed `provision.yml` at a wish path this repo does not hold, and swapped the jest testMatch for one that would skip this repo's `*.declapract.*` suites. none of that is an issue this route closes, and each would reshape this repo's own ci in an absorb pr. the husky hooks are pinned equal by a self-application test, so they converge here

## .rework
clean: a route of its own can converge the rest (dream `v2026_11_19.reseed.converge-self-workflows-and-jest`)

## .confidence
85% — the self-application rule asks for practice-driven output; B honors it where this repo already follows the practice, and defers where the gap predates this route

## .where
`.github/workflows/*` · `jest.*.config.ts` (at HEAD) · `.husky/*` · `.depcheckrc.yml` (applied)

## .verdict
open
