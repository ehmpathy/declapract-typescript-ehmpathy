# F20 — #648: drop `private`, keep `requireLinearHistory: false`

- **fork:** flip `requireLinearHistory` to `true` to match its "no merge commits" comment, or keep
  the value and fix the comment; keep or drop the `private` key beside `visibility`.
- **taken:** keep `false` (squash-only merges already give linear history; a flip tightens branch
  rules on every adopter) and fix the comment; drop `private` + its `todo` (optional, derived from
  `visibility` per declastruct-github `DeclaredGithubRepo.d.ts:43`).
- **rework:** clean — two lines.
- **confidence 75%, low because:** `private` derivation is read from the type, re-checked at the
  practice's declastruct-github floor at execution.
- **where:** `provision-github/best-practice/provision/github.repo/resources.ts:49,102`.
- **verdict:** —
