# F9 — #635: detect + mark the vendored withLogTrail fork, in `logs`

- **fork:** (a) rewrite the fork's callers onto visualogic; (b) detect the fork and stamp a
  `@declapract:review` marker that names the move. home: `logs` or `commands`.
- **taken:** (b) in `logs`. the fork's callers pass `(input)` or mix shapes; visualogic 1.3.3 needs
  `(input, context)` with `context.log` and a named fn — the same arity move as #626, which F4 found
  unsafe to automate. the marker text is shared with #626.
- **rework:** clean — the detector is one bad-practice; a later auto-rewrite sits beside it.
- **confidence 60%, low because:** home (`logs` vs `commands`, 60%) and whether S2 wants a rewrite
  (see F4).
- **where:** `logs/bad-practices/vendored-log-trail/src/**/*.ts.declapract.ts` (new).
- **verdict:** —
