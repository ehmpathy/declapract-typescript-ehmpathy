# F72 — #520: what keys the build-before-init step

- **fork:** (a) the rhachet `package.json` check accepts and the fix keeps `npm run build && rhachet
  init …` where the repo carries a `link:.` self-dep; (b) only #558's usecase owns it.
- **taken:** (a). today the CONTAINS fix strips a hand-added build step; (a) stops that in every
  usecase.
- **rework:** clean.
- **confidence 75%, low because:** a self-dep under another alias would miss the key.
- **where:** `rhachet/best-practice/package.json.declapract.ts`.
- **verdict:** —
