# F18 · `asJsonMergedDeep` keeps two required rule callbacks

- fork: peer review r011 (i004, nitpick.7) asks for one `rules` object whose members are `fn | null`, since each caller passes `() => false` for the rule it ignores. options:
  - (a) `rules: { isLeafKept: JsonLeafKeepRule | null; isArrayUnioned: JsonArrayUnionRule | null }`
  - (b) keep two required callbacks; a caller that ignores one passes `() => false` with a comment on why
- taken: (b).
  - `rule.forbid.undefined-inputs` asks each internal input to be supplied on purpose; both shapes meet it, and (a) is the same ceremony with `null` in place of `() => false`
  - (b) keeps one code path per rule: no `?.` or `?? false` branch inside the recursion
  - the rds caller already writes why it passes `() => false` ("a config array is a declared value, swapped whole"), which (a) would not ask for
- rework: clean. two callers, one util, one drift-path reader; no adopter sees the shape.
- confidence 80%: residual is that the reviewer reads the `() => false` as noise a third caller will copy without the reason.
- where: `src/utils/asJsonMergedDeep.ts` · `src/utils/genRdsConfigDeclaration.ts:166` · `src/practices/typescript-node/best-practice/tsconfig.json.declapract.ts:45`.
- verdict: —
