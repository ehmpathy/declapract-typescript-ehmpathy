# F81 — #517: a legacy tsconfig `lib` override

- **fork:** (a) a bad-practice fix appends the target lib (ES2023) to an extant `lib`, edited as
  jsonc; (b) delete `lib`.
- **taken:** (a). (b) drops a `DOM` an adopter may need.
- **rework:** clean.
- **confidence 75%, low because:** a `lib` with an older ES entry beside the new one stays noisy.
- **where:** new typescript bad-practice over `tsconfig.json`.
- **verdict:** —
