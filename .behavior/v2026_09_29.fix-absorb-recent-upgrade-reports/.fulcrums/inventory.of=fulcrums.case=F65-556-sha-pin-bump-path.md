# F65 — #556: the bump path for SHA-pinned actions

- **fork:** (a) this repo's own scheduled workflow plus a command that re-resolves each pin in
  `src/practices/**` and the actionPins clamp; (b) dependabot.
- **taken:** (a). the workflows are EQUALS templates, so a consumer-side bump is reverted on the
  next apply — the bump must happen at the source.
- **rework:** clean — swap the scheduler.
- **confidence 70%, low because:** dependabot may already rewrite the `# vN` tail and scan nested
  template dirs; both unverified.
- **where:** repo-own `.github/workflows/`, `actionPins` clamp.
- **verdict:** —
