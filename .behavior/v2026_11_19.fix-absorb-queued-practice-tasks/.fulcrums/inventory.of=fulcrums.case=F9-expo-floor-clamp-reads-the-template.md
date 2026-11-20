# F9 — the #795 clamp reads the template, not a live export

## .the fork
- A: the clamp the issue names — `build:native` red on a repo at the old floor, green at the raised one. needs a real expo 51 install plus metro in the test, at both floors
- B: a template clamp — each floor pinned at its raised value (with the metro-config pin map that justifies 51.0.26+ in a comment), `build:native` carries every flag `eas update` passes, the required `test-types` job runs it, the acceptance shard uploads `test-results/` on failure

## .taken
B. the gate itself is the live proof: once an expo repo applies this version, every pr runs the native export. a test that installs two expo trees per run would add minutes and a registry dependency to this repo's suite for a check the consumer's own ci now performs

## .rework
clean: a later integration case can add the two-floor export with no change to the templates

## .confidence
80% — the issue named A as its clamp; B proves the shipped bytes, not the skew itself

## .where
`src/practices/cicd-app-react-native-expo/package.json.declapract.integration.test.ts` [case3]

## .verdict
open
