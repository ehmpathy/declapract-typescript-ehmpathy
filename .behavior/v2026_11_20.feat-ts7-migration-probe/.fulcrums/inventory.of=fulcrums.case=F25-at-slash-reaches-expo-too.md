# F25 · `@/` reaches expo too; the rewrite lives in typescript-any

- fork: seed S3 retires `@src`. the expo/node fork stands (seed S2). options:
  - (a) node only: typescript-node and tests-node move to `@/`; expo keeps `@src/*`
  - (b) library-wide: expo moves to `@/` too, and the adopter rewrite lives in typescript-any, which both usecases compose
- taken: (b).
  - the shared fixes (`relative-imports`, `old-import-paths`, `model-dir`, `asBareDeprecatedDirSpecifierReplacement`) run on node and expo repos alike; under (a) each would need a runtime fork to emit the right alias, the special case seed S2 asked to collapse
  - expo's own `create-expo-app` template declares `"@/*": ["./*"]`, so `@/` is expo's native anchor; (b) moves expo toward its default, not away
  - the expo/node fork that seed S2 keeps is the typescript floor and the toolchain, not the alias
- rework: clean. the alias lines in the expo tsconfig, jest mappers, and fixtures revert to `@src/*`; the rewrite moves from typescript-any into typescript-node.
- confidence 85%: the ruling names one anchor with no runtime carve-out; the residual doubt is whether an expo build resolves `@/` the way metro reads tsconfig paths, which the expo usecase test covers.
- where: `src/practices/typescript-any/bad-practices/src-alias-kept/`, `src/practices/typescript-expo/best-practice/tsconfig.json`, `src/practices/tests-expo/best-practice/jest.*.config.ts`.
- verdict: —
