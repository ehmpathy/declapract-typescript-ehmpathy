# F6: collapse `*.test.tsx` too

## .the fork

- **A. literal** — collapse `*.test.ts` only, as the wish words it.
- **B. test source** — collapse `*.test.ts` and `*.test.tsx`.

## .taken: B

`tests-expo` jest configs match `**/*.test.{ts,tsx}` (`src/practices/tests-expo/best-practice/jest.unit.config.ts:40`), so an expo repo's component tests are `.test.tsx`. tests-any reaches expo repos through `typescript-project-core`. under A, half of an expo repo's tests would stay open, an inconsistency the wish's intent (collapse test source) does not want. the same intent-over-letter read as F2.

## .rework: clean

one line in the tests-any section.

## .confidence: 80%, why not higher

the wish names `*.test.ts` exactly. the wisher may have meant only the backend repos, where tests are all `.ts`.

## .risk: none

no credential, no prod write: one glob line in a shipped template.

## .where

`1.vision.yield.md` § the contract, tests-any section; Q5.
