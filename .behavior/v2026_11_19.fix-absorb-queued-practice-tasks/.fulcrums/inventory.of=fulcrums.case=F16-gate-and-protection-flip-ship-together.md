# F16 — the `test-passed` gate and the protection flip to it ship in one release

## .the fork
- a: ship both now (#781 #782 close in this release)
- b: ship the gate now, flip `contexts` next release, once the gate has reported on real prs
- c: self-apply the gate to this repo's own ci first, so this pr runs it on github
- d: run it once in a sandbox repo with a red inner job

## .taken
a. the protection flips only when an adopter's main apply runs, after its upgrade pr merges. that upgrade pr already runs `test-passed` under the old contexts, so every adopter sees the gate report green or red on a real github run before protection requires it: the upgrade pr is the canary. the gate is `if: always()` with `needs: [suite]`, so it reports on every run; `jobs.<id>.result` is the documented reusable-workflow outputs context; a named failed or cancelled job reds the gate even on a green roll-up; and a green roll-up with no job result passes with a github warn annotation, so a broken wire shows on that canary pr without a veto of every adopter's green prs (F24 weighs the two wire faults). b keeps the stale inner-name contexts that strand prs today (#781 #782), the trip the wish ranks first. c is the F11 dream's work and reshapes this repo's own ci.

## .rework
clean. drop the `contexts` change from `provision-github` resources; the gate stays.

## .confidence — 85%, why not higher
no github run of the gate exists yet; an adopter that merges an upgrade pr whose gate is red (admin merge past stale contexts) would carry a red gate into protection.

## .where
`src/practices/provision-github/best-practice/provision/github.repo/resources.ts`, `src/practices/cicd-common/best-practice/.github/workflows/test.yml`

## .verdict
— (awaits review)
