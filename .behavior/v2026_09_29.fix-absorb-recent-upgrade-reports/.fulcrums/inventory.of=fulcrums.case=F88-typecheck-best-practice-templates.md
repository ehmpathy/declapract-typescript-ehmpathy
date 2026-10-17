# F88 — the type-check clamp over the best-practice `.ts` templates

- **fork:** (a) per usecase: `executeApply` into a `genTempDir` repo, `pnpm install` against the
  emitted `package.json`, then `tsc --noEmit` with the emitted `tsconfig.json` — one integration
  test per usecase; (b) add every template dep (`pg`, `rhachet`, `sdk-aws-lambda`, …) to this
  repo's devDependencies and a `tsconfig.templates.json` over `src/practices/*/best-practice/**/*.ts`.
- **taken:** (a). templates compose across practices inside a usecase (an `@src/…` import points
  at a sibling practice's file), and each usecase pins its own dep floors. only an applied usecase
  is the tree an adopter compiles. (b) type-checks each template against this repo's dep versions
  and without its siblings, so it reads green where an adopter reads red.
- **cost:** one install per usecase in `test:integration` (6 usecases, the pnpm store cached in
  ci). measured at execution; if it exceeds the integration budget, the usecases shard.
- **the clamp bites:** red on #632's pre-fix template (`cause: error` under `unknown`), green after.
- **rework:** clean — the test shape swaps to (b) with no practice change.
- **confidence 70%, low because:** a usecase that needs live credentials at install (none known)
  would need a stub `.npmrc`.
- **where:** `src/.test/typecheck-best-practice-templates.integration.test.ts`; root `tsconfig.json`
  stays scoped to `*.declapract.ts`.
- **verdict:** —
