# F14 · a nested baseUrl folds to one named lookup key per entry, not a `"*"` catch-all

- fork: a nested `baseUrl` (`"./src"`) let bare imports (`'logic/x'`) look up there. the fold must keep that lookup once `baseUrl` leaves. options:
  - (a) a `"*": ["./src/*"]` catch-all, the shape tsc's TS5102 hint names
  - (b) one key per top-level entry of the `baseUrl` dir, read from disk at fix time: `"logic/*": ["./src/logic/*"]` for a dir, `"config": ["./src/config"]` for a module file
  - (c) no lookup at all; each bare import fails TS2307 and the readme names the hand fix
- taken: (b).
  - (a) typechecks, but tsc-alias 1.8.10 skips a key with no prefix (`dist/utils/trie.js`: `if (alias.prefix)`), and its baseUrl replacer runs only while `baseUrl` is set (`dist/helpers/replacers.js`). so `require("logic/getWaveHeight")` ships in `dist` and fails at runtime: a silent break. integration [case2] `[t1]` was red on exactly this
  - (b) keeps typecheck and emit both whole: tsc-alias rewrites each named key to a relative `require`. a dir added later has no key, so its bare import fails loud with TS2307, never at runtime
  - (c) is loud too, but turns every bare import into a hand edit an automatic fix can spare
- cost of (b): the fix reads the `baseUrl` dir via `context.getProjectRootDirectory()`, so its tests read a real dir and move to the integration grain (`tsconfig.json.declapract.integration.test.ts`).
- bounds: a repo that declares its own `"*"` gains no key (it chose its lookup; its emit seam is its own); a root `baseUrl` gains none (F7: no adopter imports bare from the root); dot entries, `node_modules`, and non-module files are skipped.
- rework: clean. the key list is one transformer (`asLookupPathEntries`); a swap to (a) or (c) is a one-function change and a test update.
- confidence 80%: residual is a bare import whose root name is also an npm package (`config`): the named key shadows the package, as `baseUrl` did for tsc, while tsc-alias's old replacer rewrote only when the file existed.
- where: `typescript-node/bad-practices/tsconfig-options-removed-in-ts7/tsconfig.json.declapract.ts`, its readme; case=4.
- verdict: —
