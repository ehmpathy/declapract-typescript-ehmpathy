# F19 · the nested-`baseUrl` fold stays automatic in this pr

- fork: peer review r011 (i007, nitpick.2) reads the org: 65 repos set `baseUrl`, all at `"."`, so none is nested. it asks to cut the nested-`baseUrl` lookup keys, about 150 lines, and flag a nested `baseUrl` with a check-only notice. options:
  - (a) cut the nested branch: the fold becomes pure and takes no `root`; a nested `baseUrl` gets a manual-fix practice
  - (b) keep the nested fold as built, tested, and verified against 95 real tsconfigs; move its disk-read test to integration grain
- taken: (b).
  - the fold is correct on real data, which the reviewer's own probe confirmed. to cut it now discards tested work for a shape change no adopter sees
  - the unit-grain breach, the one harm-adjacent part, is closed by the move to `tsconfig.json.declapract.integration.test.ts`
  - (a) reshapes two practices, their readmes, fixtures, and plan snapshots: its own reviewed change, not a rider on a compiler upgrade
- rework: clean. the fold has one entry point, `asTsconfigWithTs7OptionsFolded`; a cut swaps its nested branch for a check-only practice, and no caller depends on the keys.
- confidence 75%: residual is that 0 of 65 nested `baseUrl` repos is a strong `wet-over-dry` signal, and the branch is real upkeep (F14's tsc-alias tie).
- where: `src/utils/asTsconfigWithTs7OptionsFolded.ts` · `.dream/v2026_11_21.feat.tsconfig-fold-pure-and-jsonc-entry-ops.md`.
- verdict: —
