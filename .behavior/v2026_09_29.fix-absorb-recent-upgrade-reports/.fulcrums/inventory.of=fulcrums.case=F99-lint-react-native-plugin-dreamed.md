# F99 — 5.3: `lint-react-native`'s dead `eslint-plugin-react-native` dep is dreamed, not retired

## .the fork

- **A:** with its `.eslintrc.js` retired (the expo convergence fix), also retire the practice's last
  floor, `eslint-plugin-react-native`: blocklist it in `lint.bad-practice.eslint`, delete
  `lint-react-native`, drop it from the expo usecase roster.
- **B:** retire only the `.eslintrc.js` template that broke convergence; catch the dep as a dream.

## .taken

B. the template had to go: `lint` deletes any `.eslintrc.js`, so the expo usecase never converged
(caught by the F88 convergence clamp). the plugin dep breaks no apply, no install, and no compile;
its removal edits every expo adopter's `package.json` and a usecase roster, which no report in the
wish raised. dream: `dreams/v2026_10_16.fix.retire-lint-react-native-eslint-plugin.md`.

## .rework

dirty: A reaches every expo adopter's dependency set, and the usecase roster plus its test fixtures.

## .confidence

80% — the dep is dead without eslint, but whether an expo repo still runs eslint by hand beside
biome was not measured.
