# inventory.of=fulcrums

| case | title | rework | status | confidence | risk | risk reason |
|------|-------|--------|--------|------------|------|-------------|
| F1 | each owner practice declares its own lines, via one shared util | dirty | best-guessed | 80% | none | no credential, no prod write: the util emits `.gitattributes` text in consumer repos via `declapract apply`; a reversal is a code teardown in this repo, not an act on a live system |
| F2 | route collapse covers `.behavior/` as well as `.route/` | clean | best-guessed | 70% | none | no credential, no prod write: two glob lines in a shipped template |
| F3 | "dao-generator output" = the dao + sql footprint, not only `.generated/`; dynamodb terraform stays open | clean | best-guessed | 65% | none | no credential, no prod write: path lines in a template. it keeps the infra dir open, so no terraform change is ever folded out of a reviewer's view |
| F4 | repo-own lines move below the managed sections | clean | best-guessed | 85% | none | no credential, no prod write: line order in a generated file |
| F5 | proceed despite the code search risk; probe it on the pilot branch | clean | best-guessed | 60% | none | no credential, no prod write: the probe pushes a non-default scratch branch and runs a github code search under the human's own session; no keyrack key, no deploy |
| F6 | collapse `*.test.tsx` too, not only `*.test.ts` | clean | best-guessed | 80% | none | no credential, no prod write: one glob line in a shipped template |
| F7 | a declarer tag in each managed header (`# [tests-any] ...`), not a registry of sections | clean | best-guessed | 75% | none | no credential, no prod write: header text in a generated file |
| F8 | the live github render and the pilot numbers land at verification, not execution | clean | best-guessed | 85% | none | no credential, no prod write: a deferral moves no code; the later probe pushes a non-default branch under the human's own session |
| F9 | routine rhachet role bumps ride along in this branch | clean | best-guessed | 85% | none | no credential, no prod write: version pins in a dev manifest and a file mode |
| F10 | a gitattributes check failure reads as every declaration's does: an expect diff | clean | best-guessed | 80% | none | no credential, no prod write: the text of a plan-time failure |
| F11 | the shared util keeps its shape: a plain function, no dedupe (revised at i005), a named declarer order, whole own-block rewrite | clean | best-guessed | 80% | none | no credential, no prod write: the code shape of a template util and line placement in a generated file |
| F12 | the practices declare one repo-root `.gitattributes`, not a file per directory | clean | best-guessed | 85% | none | no credential, no prod write: where a generated text file lives |
| F13 | a line in a declarer's own block that its template no longer lists is kept, as a repo-own line | clean | best-guessed | 80% | none | no credential, no prod write: which lines a generated file keeps |
| F14 | the un-fold signpost lives in the git readme, not as a comment in the shipped file | clean | best-guessed | 75% | none | no credential, no prod write: a comment in a generated file |
| F15 | the two new skills and the fold lists stay wet; the fixture move stays in scope | clean | best-guessed | 80% | none | no credential, no prod write: code shape and test fixture location |
| F16 | `*.snap` stays open with no line, not an explicit `*.snap -linguist-generated` | clean | best-guessed | 75% | none | no credential, no prod write: one line in a generated file |
| F17 | the github render carries a cited exception, not an automated integration test; the pilot pr is the real call | clean | best-guessed | 70% | none | no credential, no prod write: the choice adds no code; the pilot pr runs under the human's own session |
| F18 | the git merge header keeps its shipped words; only the tag is added | clean | ruled (peer review 5.3 i005 r012: reword reverted) | 90% | none | no credential, no prod write: header text in a generated file |
