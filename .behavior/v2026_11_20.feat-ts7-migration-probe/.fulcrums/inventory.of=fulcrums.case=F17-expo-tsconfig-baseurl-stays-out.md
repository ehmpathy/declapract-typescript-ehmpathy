# F17 · the expo tsconfig `baseUrl` stays out of this pr

- fork: `typescript-expo/best-practice/tsconfig.json` still sets `"baseUrl": "."` with bare `paths`. typescript 6.0.3, the version expo sdk 56–58 pins, rejects `baseUrl` with TS5101 unless `"ignoreDeprecations": "6.0"` is set. options:
  - (a) drop `baseUrl` from the expo template here, and lift `tsconfig-options-removed-in-ts7` to `typescript-any` so expo adopters get the fold
  - (b) leave expo as is; the dream `v2026_11_20.feat.expo-typescript-7-floor` holds the fix with its shape
- taken: (b).
  - the ruled scope moves the floor in typescript-node only; a lift of the bad-practice to `typescript-any` changes what every expo and node adopter's apply runs, a second practice's behavior
  - expo adopters stay on their own pinned typescript; this pr changes none of their files, so it breaks none of them
  - the expo fix wants its own walk on an expo consumer (`expo install --check`, metro), which this route never ran
- rework: clean. the fold is already built and tested; the lift is a move of one dir plus an expo walk.
- confidence 80%: residual is that the wisher reads "move typescript-node to ts7" to include every tsconfig this package ships.
- where: the dream above; the pr body's scope line.
- verdict: —
