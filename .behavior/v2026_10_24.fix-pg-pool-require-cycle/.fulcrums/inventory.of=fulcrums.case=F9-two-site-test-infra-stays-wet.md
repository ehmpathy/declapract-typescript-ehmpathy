# F9: the two-site test infra stays in each test, not lifted to `src/utils/`

- fork: lift `asMaskedOutput` and the pinned-pnpm-via-npx spawn into `src/utils/` · keep a copy in each of the two
  integration tests
- found: two usages, in `typecheckBestPracticeTemplates.declapract.integration.test.ts` and
  `pg-pool-patch.declapract.integration.test.ts`. their spawns differ (async + 900s with a promise, vs sync + 120s)
- taken: keep them wet. `rule.prefer.wet-over-dry` (mechanic) waits for a third usage before an abstraction; at two,
  the shared shape is not yet known, and the spawn signatures already diverge
- the cycle transformers (`asCycleSummary`, `asCyclePackages`) stay too: one usage, in the walk test. a lift to
  `src/utils/` with its own unit test would ship a test-only transformer beside prod code; it lifts when a second
  test reads dpdm output. its regex is exercised on real dpdm output by every walk run
- the literal `patches/pg-pool.patch` in the patch test stays literal: a test's expected value is spelled out, never
  derived from the subject under test, or a wrong path in the practice would pass its own clamp
- rework: clean — a lift is a move plus two import edits when a third test needs them
- confidence: 85%. `asMaskedOutput` alone is identical and tiny; a reviewer may prefer it lifted now
- where: the two tests above
- verdict: —
