# F18 — #600: pin terraform 1.9.8

- **fork:** which 1.x to pin in `.terraform-version` (0.14.11 today, below every `required_version >= 1.7`).
- **taken:** 1.9.8 — the newest line this driver can name that satisfies `>= 1.7`; confirmed or
  bumped against the published release list at execution. seed S1 says terraform leaves soon, so the
  pin only has to stop the self-contradiction, not chase latest.
- **rework:** clean — one line.
- **confidence 55%, low because:** the exact number is unverified; a clamp asserts the pin satisfies
  every best-practice `required_version`, so a wrong number fails loud here, never in an adopter.
- **where:** `terraform-common/best-practice/.terraform-version`.
- **verdict:** —
