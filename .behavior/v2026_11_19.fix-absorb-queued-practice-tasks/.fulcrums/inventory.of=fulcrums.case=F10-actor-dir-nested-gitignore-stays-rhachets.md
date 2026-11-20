# F10 — #786 declares the root line; the nested `.agent/.actors/.gitignore` stays rhachet's

## .the fork
- A: the rhachet practice declares both halves of the 1.50 layout: the root `!.agent/.actors/actor.via.repo=ambient/` line, and a whole-file template for `.agent/.actors/.gitignore`
- B: the practice declares the root line (and retires the pre-1.50 `.default` line); the nested file stays with rhachet's own writer (`findsertDirGitignore`), which regenerates it at each init, link, or upgrade

## .taken
B. a template for the nested file is a new shipped file, which the director ruled out, and an EQUALS check on a file rhachet rewrites would fight every rhachet version that moves its exception chain. once a repo commits the nested file rhachet writes, the findsert is a no-op there

## .also
a declared `!` line was not a fixed point in the shared gitignore algorithm (a sort put it in the body, then a second pass lifted it to the negation tail). the algorithm now places a declared negation in the tail on the first pass; clamped in `defineExpectedGitignoreContents.declapract.test.ts` [case1.1]

## .rework
clean: a later practice can add the nested template with no change to the root line

## .confidence
82% — the issue names both halves; B lands the half that churns the root file and leaves the self-healed half to its owner

## .where
`src/practices/rhachet/best-practice/.gitignore.declapract.ts` · `src/utils/defineExpectedGitignoreContents.ts`

## .verdict
open
