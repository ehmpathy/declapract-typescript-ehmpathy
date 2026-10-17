# F15 — #603/#604: one acceptance concept, two runners, homed in tests-expo

- **fork:** a new `tests-playwright` practice vs fold into tests-expo; one `test:acceptance` that
  detects its runner at run time vs a separate `test:play` key; `play.acceptance.config.ts` vs the
  stock `playwright.config.ts` name.
- **taken:** fold into tests-expo; `test:acceptance` detects the runner by config prefix (same rule as
  F13, so one string serves every usecase and a narrow `--practice tests-any` apply cannot revert it);
  `play.acceptance.config.ts`, with a bad-practice that relocates `playwright.config.ts`.
- **rework:** dirty — once adopters hold `play.acceptance.config.ts`, baselines, and a metro
  blockList insert, a rename or a split into another practice moves files in every expo repo.
- **confidence 55%, low because:** home (60%), runtime detection (55%), and the metro blockList
  without a `metro-config` require on sdk 54 (70%) each carry doubt.
- **where:** `tests-expo/best-practice/{play.acceptance.config.ts,metro.config.js,jest.unit.config.ts}`,
  `tests-any/best-practice/package.json`.
- **verdict:** held by the wisher (seed S3) — #603/#604 wait for app-protools-native's latest work.
