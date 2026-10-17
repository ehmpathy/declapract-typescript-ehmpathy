# F103 — 5.3 peer i001: the 27 approved-lane nitpicks, each disputed with its evidence

## .the fork

six approved lanes left 27 nitpicks, past the stone's allowance of 7. each was read and tested
against the tree.

- concede: change the code per nitpick
- dispute: show the point holds no defect, or that the change it asks for would regress a guarantee

## .taken — dispute, per lane

### r023 ergo-snapshot-visual-blemishes-slice-rds (9)

| nitpick | evidence |
|---|---|
| n1 server token | `'cloud@aws.lambda'` is the token `sdk-environment` emits; the prior template revision `old-templates/getDatabaseConnection.e0c53d8.ts:50` already reads it, and `database-client.declapract.integration.test.ts:95` types `server: 'cloud@aws.lambda' \| 'local@node'` |
| n2 for-plan password | the report itself says the readme names `for-plan` the one decrypt-exempt credential, "so this is fine"; the plan grant reads it by design |
| n3 orphaned `access` | the report: "no code defect observed"; `access` feeds `tags.environment` |
| n4 regex `g` flag | both patterns lack `g`; the report: "safe for the current regexes". a guard against a flag no one adds is speculative |
| n5 port collision | the report: "no defect … fine as-is" |
| n6 `\|\| true` | the report: "behavior is correct … no defect" |
| n7 ENOENT read | the report: "it is fine … no defect" |
| n8 10 fixtures vs 8 fingerprints | the report: "10 fixtures vs 8 fingerprints is consistent … no defect observed" (two revisions were format-only) |
| n9 jsdoc `{}` context | the report: "this compiles … no defect" |

### r024 ergo-snapshot-visual-blemishes-slice-rest (2)

| nitpick | evidence |
|---|---|
| n1 phase-cost `console.log` | deliberate: the comment above it reads "report the per-phase cost, so a slow usecase is visible in the run log". the F88 suite runs ~28 min; per-usecase apply/install/compile ms is how a slow phase is found. it is test output, not a snapshot, as the report notes |
| n2 `to author` / `to fix` | the report retracts it: "not a violation" |

### r026 mech-given-when-then-slice-nz (9)

all nine flag a `given → then` with no `when`. `rule.require.given-when-then` asks for
`given/when/then`, and test-fns permits `given → then` where the scene IS the act (a pure check
call on a fixed input). the extant suites across this repo use both shapes; to wrap nine files in
a `when('[t0] check')` adds a level and no assertion. graded `better`: no shipped harm, no test
weakened. two of the nine (n4 pnpm-workspace, n9 catch-cause) already hold a `when` per the
report's own snippet.

### r029 mech-test-intent-slice-am (1)

| nitpick | evidence |
|---|---|
| n1 `type-fns` override vs declared dep | the assertion compares two DIFFERENT fields — `pnpm.overrides['type-fns']` against `dependencies['type-fns']` — which is the #624 invariant itself ("raise the override to the declared version"). it fails if the fix leaves the override at any other value; `.not.toEqual('1.9.9')` pins the old value gone. a fixed constant would assert the current floor and churn on every floor bump, a weaker statement of the same rule |

### r002 repo-rules-slice-nz (5)

| nitpick | evidence |
|---|---|
| n1 hazard pitch in the lambda-client marker | the marker states a mechanism and its fix (drift from the peer contract → generate via the codegen command); one clause, no capitals, no alarm word |
| n2 `declapract-typescript-ehmpathy#532` in the marker | the token is the marker's idempotency key: `withLambdaClientGenMarker.ts:24` skips any file that already holds it, so a second apply never stacks a second marker. it must be unique and durable; an adopter reads it as the issue that explains the marker |
| n3 `*/` in `serverless/.declapract.readme.md` | a `.declapract.readme.md` is read by declapract, never emitted, and markdown holds no block comment |
| n4 no before/after snapshot | the report's own snippet is `expect(await read(pkgPath)).toMatchSnapshot('package.json — before')` |
| n5 process-local `rootsNoticed` | print-once per process is the intent: one notice per `declapract apply` run; the notice is stderr, never a file write, so the fix's output stays a fixed point |

### r004 repo-rules-slice-rest (1)

| nitpick | evidence |
|---|---|
| n1 hazard pitch in `.husky/check.timestamps.sh` | that comment is the zero-exemption guard of `rule.forbid.timestamp-hook-exemptions` (S16); its emphasis is deliberate, and any edit to the hook owes a restamp of its lock. the root copy mirrors the practice byte-for-byte, so a reword is a practice decision, not a 5.3 fix |

## .rework

clean — each row is a single-file edit if the council overrules it.

## .confidence

85% — most rows cite the report's own "no defect"; the judgment rows are r026, r024 n1, r002 n1/n2.

## .verdict

open, for the council.
