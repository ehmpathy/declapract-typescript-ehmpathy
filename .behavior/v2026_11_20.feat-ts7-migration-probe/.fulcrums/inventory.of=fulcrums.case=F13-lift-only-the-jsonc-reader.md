# F13 · lift only the jsonc reader; the fold-specific steps stay in the bad-practice

- fork: a peer review asked to lift every procedure of the ts7 bad-practice into `src/utils`, one per file, and to move `legacy-tsconfig-lib` onto the shared reader. options:
  - (a) lift all eight, and rewire `legacy-tsconfig-lib`
  - (b) lift what a second caller reads; keep the rest at the leaf
- taken: (b).
  - lifted, on their second use (the best-practice tsconfig fix parses jsonc too): `asJsoncView`, `asJsoncSpliced`, `asJsoncParsed`, `getOneJsoncDirectMatch`, `getIndexOfJsoncObjectClose`, `getOneJsoncObjectSpan`, `getJsoncCompilerOptionsSpan`
  - kept at the leaf: the string-entry read, the entry removal, the path rebase, the lookup keys (F14), the root-dir test. no other declaration reads them; `rule.prefer.most-common-denominator` keeps an operation at its leaf until a second caller needs it, and calls a speculative lift a defect
  - `legacy-tsconfig-lib` is extant code this pr does not touch; its commented-out-key hazard is real, but a rewire is a behavior change to another practice (F8's bound)
- rework: clean. each kept procedure moves to `src/utils` with an import line; the expo dream (`v2026_11_20.feat.expo-typescript-7-floor`) names the lift as its first step.
- confidence 85%: residual is the expo lift, which would want the fold steps shared too; it lifts them when it lands.
- where: `typescript-node/bad-practices/tsconfig-options-removed-in-ts7/tsconfig.json.declapract.ts`, `src/utils/*Jsonc*`; review r11 point 6.
- verdict: —
