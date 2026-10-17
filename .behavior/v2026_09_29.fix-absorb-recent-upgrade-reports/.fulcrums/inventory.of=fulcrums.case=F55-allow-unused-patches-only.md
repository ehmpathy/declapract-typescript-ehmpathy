# F55 — #680: take `allowUnusedPatches` only

- **fork:** (a) both `allowUnusedPatches` and `ignorePatchFailures`, as asked; (b) only
  `allowUnusedPatches`.
- **taken:** (b). a stale patch is harmless, so to allow it unblocks the upgrade. a patch that
  fails to apply means a fix the adopter relied on silently vanished — to ignore that is a failhide.
- **rework:** clean — one key in a CONTAINS template.
- **confidence 60%, low because:** the reporter met both failures on upgrade; a failed patch after a
  dep bump may be just as stale in practice.
- **where:** `pnpm/best-practice/package.json`.
- **verdict:** overruled by the wisher (seed S10) → (a). both keys land; a stale or failed patch
  warns, never halts `rhx upgrade`. the warn is pnpm's own; no fixless declapract check flags it,
  since such a check marks `package.json` manual and blocks `apply` in the same way. the stale half
  gains a fix-based retire (F56).
