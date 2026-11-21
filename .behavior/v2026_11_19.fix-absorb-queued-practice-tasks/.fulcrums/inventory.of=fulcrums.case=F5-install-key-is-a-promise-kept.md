# F5 — a lost cache reserve in `.install.yml` (#793)

## .the fork
- a: `.install.yml` waits on a lost reserve until the winner's key appears, so its output is a promise kept (#793's shape)
- b: `.install.yml` saves under `continue-on-error`, then a lookup-only restore confirms the key; on no key, the job fails loud with the race named
- c: each consumer restore installs on a miss rather than fail

## .taken
a, bounded: after the save, a few `actions/cache/restore` steps with `lookup-only: true` on the same key, a short sleep between, each gated on the prior miss (the winner's save lands in seconds); if no attempt finds the key, the job fails loud with the race named. the output stays a promise; consumers keep `fail-on-cache-miss: true` (#533 set it so a miss never runs with no node_modules).

## .rejected within a
a shell loop over the cache api (`gh api .../actions/caches?key=`) needs `actions: read`. six reusable workflows call `.install.yml` (`.test.yml`, `.declastruct.yml`, `.publish-npm.yml`, `.sql-schema-control.yml`, `.deploy-sls.yml`, `.deploy-expo.yml`), and permissions intersect down the chain, so every top-level caller would widen its grant. the repeated lookup-only steps need no grant.

## .rework
clean. one workflow file.

## .confidence — 80%
the repeated-step poll is unusual in shape; a clamp on the step list (count, gates, the fail line) guards it.

## .where
`src/practices/cicd-common/best-practice/.github/workflows/.install.yml`

## .verdict
— (awaits review)
