# F10 — #611/#612: bar imds in useKeyrack, strict mode only under aws auth

- **fork:** bar the ec2 metadata service (`AWS_EC2_METADATA_DISABLED=true`) always, only when the
  repo declares aws auth, or in the jest env files; source keyrack `strict` always or only when aws
  auth is required.
- **taken:** in useKeyrack, gated on `requiresAwsAuth`, set before the static-creds return; `strict`
  only when aws auth is required. ci is untouched (`CI` short-circuits earlier).
- **rework:** clean — one gate expression.
- **confidence 60%, low because:** a repo with no `awsAccountId` but an sdk call in tests still falls
  to the instance role; strict-only-under-aws is the least-surprise guess, not a measured one.
- **where:** `tests-node/best-practice/src/.test/useKeyrack.ts:193-205`.
- **verdict:** —
