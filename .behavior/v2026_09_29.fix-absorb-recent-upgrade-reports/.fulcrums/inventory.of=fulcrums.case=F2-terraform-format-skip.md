# F2 — #645: skip terraform fmt off ci, strict in ci

- **fork:** (1) skip with a notice when `terraform` is absent and `CI` unset; strict in ci. (2)
  declare the binary via a readme line + a `check:tools` step.
- **taken:** (1). it removes the local wall with one command change and keeps ci as the gate; (2)
  still fails on a laptop, only with a better message.
- **rework:** clean — a command value in a CONTAINS-checked `package.json`.
- **confidence 75%, low because:** a local skip lets a dev commit unformatted `.tf` that ci then
  rejects; some maintainers prefer the loud local failure.
- **where:** `terraform-common/best-practice/package.json`.
- **verdict:** overruled by the wisher (seed S1) — neither fork. terraform is on its way out, so no
  practice runs `terraform fmt`: the scripts leave the practice and the format chains drop them.
