# F10: the clamps stop at the path this practice ships; adjacent cells stay unbuilt

- fork: build a clamp for each adjacent cell a reviewer named · bound the clamps to the path an rds adopter walks
- the cells left unbuilt, each with why:
  - a pg-pool 2.x copy in a lockfile: `pg@8.3.0`, the floor this practice ships, asks for `pg-pool@^3.2.1`, and
    pg-pool 3.x peers on `pg>=8`. a 2.x copy needs a second, pre-8 pg in the tree, which no practice ships. if one
    lands, the hunk misfits and pnpm warns by name (`[case5]`), and the cycle stays as it was before this pr
  - a dependency (not the repo) that calls `new Pool()` from pg-pool with no `Client`: no dep any practice ships does
    so; the throw would be loud (`this.Client is not a constructor`, clamped per release in `[case2] [t1]`), and the
    header names the fix
  - the case2 fixture holds pg-pool as a direct dep: pnpm keys a patch on the package name and version, never on
    whether a dep is direct. the transitive path is walked end to end in `[case6]` (pg pulls pg-pool) and in the
    usecase walk (`lambda-service-with-rds`)
  - a snapshot of the masked red cycle output: `[case6] [t1]` asserts the `pg -> pg-pool` chain by pattern; its
    full text is dpdm's own format, so a snapshot would churn on each dpdm release for no adopter gain
- the cells built in its place: the stale retire beside a bare key, end to end
  (`stale-patched-dependency.declapract.integration.test.ts`); the header's way-out, lockfile, and recut lines
- rework: clean — each cell is one more `given` in an extant suite, if a real adopter ever meets it
- confidence: 85%. low in that a reviewer may weigh the 2.x cell above its evidence
- where: `src/practices/persist-with-rds/pg-pool-patch.declapract.integration.test.ts`
- verdict: —
