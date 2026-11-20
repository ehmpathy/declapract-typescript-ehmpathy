# F12 — the probe stub shape in the preflight clamp stays a named test-local type

## .the fork
- a: inline `{ host; port; username; password; database }` at each use, per `rule.forbid.io-as-interfaces`
- b: keep `type ProbeArgs` in the test file

## .taken
b. it is no procedure's declared input: it types a stub's spy record, read at four sites (the runner's return, its accumulator, the stub's arg, one then's spy). the rule's own exception admits a shape reused 3+ times. four inline copies would drift apart, and a drift would read as a probe-arg defect.

## .rework
clean. an inline swap is four type literals in one test file.

## .confidence — 88%, why not higher
the reviewer graded it a nitpick; the rule's 3+ exception names "procedures across modules", and these four sites sit in one module.

## .where
`src/practices/tests-node/testdb-preflight-branches.declapract.integration.test.ts`

## .verdict
— (awaits review)
