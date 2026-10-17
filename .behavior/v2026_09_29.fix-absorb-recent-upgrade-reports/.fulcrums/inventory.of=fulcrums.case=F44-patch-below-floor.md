# F44 — #670: retire only patches keyed below the 0.7.1 floor

- **fork:** (a) delete every `sdk-aws-lambda@*` patch; (b) delete only patches keyed on a version
  below the floor.
- **taken:** (b). a repo may patch 0.7.1 for a reason of its own; (a) would drop it.
- **rework:** clean — one semver compare.
- **confidence 80%, low because:** a patch keyed on a range, not a version, needs a rule of its own.
- **where:** `node-service/bad-practices/sdk-aws-lambda-pre-0.7/`.
- **verdict:** —
