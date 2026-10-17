# F16 — #608: expo `provision.yml` via a merge-by-job fix

- **fork:** add cicd-package's `provision.yml` to the expo usecase as EQUALS, or declare it in
  cicd-app-react-native-expo with a check/fix that replaces the `github` job and drops any job that
  references `provision/github/`, keeps all else.
- **taken:** the merge-by-job fix. an expo app may hold other provision jobs (aws); EQUALS would
  delete them.
- **rework:** clean — one declaration.
- **confidence 65%, low because:** a yaml job-level merge must keep comments and order; verified by
  the before/after integration fixture.
- **where:** `cicd-app-react-native-expo/best-practice/.github/workflows/provision.yml{,.declapract.ts}`.
- **verdict:** —
