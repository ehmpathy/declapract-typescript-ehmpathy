# F5: the walk's `[t3]` asserts no cycle through pg-pool, not a clean exit

- fork: `[t3]` asserts `test:lint:cycles` exits 0 · `[t3]` asserts no cycle runs through pg-pool, with every
  other cycle held in a snapshot
- found: the red run showed every usecase red for reasons outside this wish. four usecases (typescript-project,
  npm-package, rhachet-roles-package, app-react-native-expo) emit no `src/**/*.ts` into a bare repo, so dpdm exits 1
  on "No entry files were matched". the three lambda usecases report 7 other cycles at floor versions: util ->
  inherits, domain-objects (x2), helpful-errors, with-simple-cache (x2), bottleneck
- taken: assert no pg-pool cycle in every usecase; assert rds analyzed a tree; snapshot the rest. this clamps the
  wish's claim and keeps every other cycle visible, without a scope leak into five other packages
- why the snapshot holds the other cycles, though they float with upstream and repeat across the three lambda
  usecases: the snapshot is the signal that a new cycle reached an adopter, and each usecase is its own adopter. a
  float that reddens an unrelated pr names the package that moved, which is the moment a maintainer wants it seen;
  the pg-pool verdict itself rides on the assertions, never on the snapshot. the floor-cycles dream retires the list
- rework: clean — once the other cycles are cured, the assertion tightens to `exits 0`
- confidence: 80%. the wish's "a repo passes its cycle check" reads wider than pg-pool; the downstream repo went
  green with the pg-pool patch alone, which suggests the other cycles are absent at the versions it holds, but the
  walk pins floors
- where: `src/typecheckBestPracticeTemplates.declapract.integration.test.ts` `[t3]`
- followup: `.dream/2026_10_24.fix-floor-version-dependency-cycles.dream.md` (linked from `$route/dreams/`)
- verdict: —
