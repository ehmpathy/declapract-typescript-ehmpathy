# F17 — #610: print the contention set to stderr at the hoisted flip

- **fork:** stderr at the moment the `.npmrc` fix adds `node-linker=hoisted`, or a comment block in
  `.npmrc` itself.
- **taken:** stderr, once per root (memoized; declapract calls fix in plan and apply). a comment in
  `.npmrc` goes stale the moment an override lands and is a second declaration of lockfile state.
- **rework:** clean — the output channel is one call.
- **confidence 70%, low because:** declapract may buffer or drop fix-time stderr in some output
  modes; the integration test spies stderr to prove it surfaces.
- **where:** `node/best-practice/.npmrc.declapract.ts:60`; pure `getOneContentionSetFromLockfile`.
- **verdict:** —
