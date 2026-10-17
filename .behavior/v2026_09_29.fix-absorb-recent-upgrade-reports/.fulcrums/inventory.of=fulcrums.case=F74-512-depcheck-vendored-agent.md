# F74 — #512: ignore vendored `.agent/repo=<other>/` in depcheck

- **fork:** (a) #639's `ignorePatterns` gains `.agent/repo=*` plus `!.agent/repo=.this`; (b) list
  each known vendored role dir.
- **taken:** (a). one pattern covers every future role.
- **rework:** clean.
- **confidence 80%, low because:** depcheck's honor of a `!` negation in `ignorePatterns` is
  unverified; proven by the fix test at execution, else (b).
- **where:** `lint/best-practice/.depcheckrc.yml(.declapract.ts)`.
- **verdict:** —
