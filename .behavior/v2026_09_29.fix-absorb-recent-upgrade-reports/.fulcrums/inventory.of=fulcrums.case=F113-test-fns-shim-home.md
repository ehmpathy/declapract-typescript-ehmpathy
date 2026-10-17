# F113 — the test-fns subpath stand-in lives at `src/.test/assets/`, linked by a reference

- **fork:** (a) `src/.types/test-fns.autoprune.d.ts`; (b) `src/types/test-fns.autoprune.d.ts`;
  (c) `src/.test/assets/test-fns.autoprune.d.ts`, reached by a triple-slash reference from each
  `jest.*.prepare.ts`.
- **taken:** (c). the expo tsconfig `include` is `**/*.ts`, and a typescript wildcard skips
  dot-prefixed dirs, so (a) compiles to TS2307. (b) compiles, but puts a test-only type in a prod
  path under `src/` (`rule.forbid.test-assets-in-src`). (c) puts it in the test-asset home and links
  it from its only importers, so no tsconfig has to name it.
- **evidence:** the compile clamp runs the shipped prepare templates under node and bundler module
  lookups. with the stand-in removed, the node case went red (TS2307); restored, all 7 pass.
- **wisher:** "Keep shim this round" over a test-fns repair now, or a dispatch that holds the
  release (S25). the root fix is the test-fns `typesVersions` dream.
- **gap seen:** `bestPracticeTemplateParse` skips every `.test` dir (`PRACTICE_TREE_SKIP_DIRS`), so a
  template under `best-practice/src/.test/` has no parse gate. that holds for this stand-in and for
  the extant tests-node and persist-with-rds `src/.test/` templates.
- **rework:** clean. never shipped (no history at the old path), so a plain move.
- **confidence 85%** — the triple-slash reference is the one new idiom an adopter sees. a biome rule
  could flag it in some adopter's config; this repo's lint passes.
- **where:** `src/practices/tests-expo/best-practice/`.
- **verdict:** ruled by the wisher (keep this round); the home is a best guess.
