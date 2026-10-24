# F15: extant test shapes this pr only appends to stay as they are

- fork: append to an extant test in its own shape (a caselist row; a case beside the extant ones) · recast the
  extant file into the shape a reviewer prefers (given/when/then; no console capture)
- found: two reviewer nitpicks name shapes that predate this pr. `getAllStalePatchKeys.declapract.test.ts` is a
  data-driven caselist; this pr appends one row. the walk test's `console.log` spy captures declapract's plan report
  and sits in main unchanged
- taken: append in the extant shape. a caselist is the sanctioned shape for a pure transformer
  (`rule.prefer.data-driven`), and the spy captures output rather than fakes a boundary. a recast would rewrite
  tests this wish has no cause to touch, the very change `rule.forbid.test-intent-violations` asks a pr to avoid
- rework: clean — each recast is one file, in a pr of its own
- confidence: 85%. a reviewer may prefer the recast ride along under scouts honor
- where: `src/utils/getAllStalePatchKeys.declapract.test.ts`,
  `src/typecheckBestPracticeTemplates.declapract.integration.test.ts`
- verdict: —
