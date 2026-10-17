# F31 — #619: no consumer env code; `build:web` defaults ACCESS to prep

- **fork:** also author a consumer-side guard that refuses `NODE_ENV=production` with no access (the
  issue's step 3), or satisfy it by construction.
- **taken:** by construction — the deploy compile step passes `env: ACCESS: ${{ inputs.access }}`,
  and `build:web` is `ACCESS=${ACCESS:-prep} npx expo export --platform web --clear` (with #618's
  `--clear`), so no build reaches prod by default. no practice owns the consumer's env module.
- **rework:** clean.
- **confidence 65%, low because:** a consumer that reads a differently named env var still guesses;
  the readme names `ACCESS`.
- **where:** `cicd-app-react-native-expo/best-practice/.github/workflows/.deploy-expo.yml:133-134`,
  `typescript-expo/best-practice/package.json:4`.
- **verdict:** —
