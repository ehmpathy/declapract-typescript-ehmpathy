# F24 · the one alias anchor is `@src/`; the root `@/*` leaves

- fork: the review asks for one path anchor, written as `@/src`. options:
  - (a) `@src/*`: keep the alias the library already uses, drop the root `@/*`
  - (b) `@/src/*`: a new anchor, and every `@src/` site rewritten to it
- taken: (a), until the commander reads it.
  - `@src/` is the library's anchor: 6 templates import through it; the fixes `relative-imports`, `model-dir`, `old-import-paths`, `simple-lambda-client`, `withPgClientSslDeclared`, `asSourceOnRunLambdaEndpoint` emit it; the jest mappers, biome import groups, depcheck, and the expo tsconfig name it; `practiceTemplateSrcAliasImports` enforces it (#630)
  - `@/src/` has 0 uses; the root `@/*` has 0 imports in any template
  - (b) would rewrite each site above and every adopter import, and tsc-alias 1.8.10 left `@/src/…` unrewritten under `rootDir: src` (dream `at-alias-unrewritten-under-rootdir-src`)
  - both readings drop the root `@/*`, so that half lands either way
- rework: dirty for (b): a sweep of every `@src/` site, a new bad-practice to rewrite adopter imports, and a build seam test that proves tsc-alias maps `@/src/*`.
- confidence 75%: the comment's words name `@/src`; its reason, consistency, names the extant anchor.
- where: `src/practices/typescript-node/best-practice/tsconfig.json`, `src/practices/tests-node/best-practice/jest.{integration,acceptance}.config.ts`; the reply on #839 thread `discussion_r4695871121`.
- verdict: —
