# F26 — the gate rolls up every suite job, `test-evaluation` included

## .the fork
- (a) the gate names a `REQUIRED` list equal to the nine contexts the old protection required (`enshard`, `test-shards-*`, `test-shards-omit`, `test-evaluation` left out)
- (b) the gate rolls up all 13 jobs of `.test.yml`: a job the suite runs that fails or is cancelled turns the gate red; a job the repo lacks reads skipped, a pass

## .taken — (b), the wider roll-up, on purpose
- the gate exists so protection never names jobs by hand; (a) brings back a hand list inside the gate, the same drift one level down
- a shard or enshard job that fails leaves its tests unrun; the old protection let that merge, as an omission, not a decision
- `test-evaluation` runs only in a repo that declares `test:evaluation`, which declares it to grade; a repo that wants it advisory moves it out of the suite
- the pr body names the wider roll-up, so an adopter whose evaluation is red learns why its prs now block

## .rework — clean
the gate's jq filter gains a `select` on a named list; no caller or contract changes

## .confidence — 75%
low because the fleet's evaluation lanes are unread: a repo whose evaluation is red on main would block every pr at upgrade. the pr body and issue reply name it

## .where
`src/practices/cicd-common/best-practice/.github/workflows/test.yml` (`test-passed`)

## .verdict
open — fulcrum council at the end of the route
