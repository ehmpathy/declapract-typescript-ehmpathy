# F86 — #541: the guard that every gitignore declarer uses the shared util

- **fork:** (a) #630's multi-declarer clamp gains an enumeration of every `*.gitignore.declapract.ts`
  that asserts the util import; (b) a standalone test beside the util.
- **taken:** (a). one clamp owns the multi-declarer contract.
- **rework:** clean.
- **confidence 80%, low because:** an import assert proves use, not that the result passes through.
- **where:** #630's clamp; `src/utils/defineExpectedGitignoreContents.ts:58-59`.
- **verdict:** —
