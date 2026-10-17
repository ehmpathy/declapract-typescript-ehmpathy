# F47 — #672: drop `npx` only where the practice declares the bin

- **fork:** (a) persist-with-rds only, as the issue names; (b) every practice, wherever `npx` calls a
  bin that same practice declares as a dependency; (c) every `npx` in every template.
- **taken:** (b). (c) breaks `serve`, `local-ssl-proxy`, and possibly `eas`, which may not be local
  deps. (a) leaves the same noise in seven other practices.
- **rework:** clean — template values.
- **confidence 85%, low because:** a bin may come from a dep that another practice in the usecase
  declares, not the one that calls it; such a call keeps `npx`.
- **where:** persist-with-rds, persist-with-dynamodb, artifact, lint, conventional-commits,
  serverless, typescript-expo, cicd-app-react-native-expo.
- **verdict:** —
