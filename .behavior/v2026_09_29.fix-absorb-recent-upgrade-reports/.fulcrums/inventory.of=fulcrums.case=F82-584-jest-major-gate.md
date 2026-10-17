# F82 — #584: close as D0, though the jest major is ungated

- **fork:** (a) close #584 with b8d4803 (the jest-expo major gate it asked for); (b) also gate the
  jest 30 floor for jest-expo ≤53.
- **taken:** (a). #584 asks for the jest-expo gate, which ships. (b) touches the expo test
  practice that S3 holds.
- **rework:** clean.
- **confidence 75%, low because:** an expo 53 repo may still meet jest 30 from tests-any.
- **where:** `tests-expo/best-practice/package.json.declapract.ts:91-108`.
- **verdict:** —
