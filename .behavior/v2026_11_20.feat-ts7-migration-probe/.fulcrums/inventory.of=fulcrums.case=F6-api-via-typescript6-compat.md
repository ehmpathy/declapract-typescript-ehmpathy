# F6 · this package reads the compiler api via `@typescript/typescript6`, not the `typescript` peer

- fork: three shipped bad-practices (`old-stage-enum`, `old-get-database-connection`, `pg-client-without-ssl`) and four `src/utils` modules call the classic compiler api via `import ts from 'typescript'`, a peer dep. `typescript@7.0.2` exports only `{ version, versionMajorMinor }` (`lib/version.cjs`). once the floor puts an adopter on 7.0.2, `ts.createSourceFile` is undefined; a bad-practice check that throws reads as "not detected", so those three checks go quiet. options:
  - (a) pin `@typescript/typescript6` (microsoft's compat package: classic api at `lib/typescript.js`, bin `tsc6`) as a runtime dep; every api reader imports from it
  - (b) hold the floor at 5.x until the 7.1 api ships; the pr carries measurements + this reason only
- taken: (a). the break has a fix that holds on 5.4.5 too (the compat package is independent of the adopter's `tsc`), so the ruled holds bar (F5) still passes. (b) withholds a 5.6× typecheck win from every adopter for a defect local to this package.
- rework: clean. revert = the import swap in ~10 files + one dep line; no adopter contract changes.
- confidence 85%: the compat package's api surface for scanner/ast calls is 6.0, a superset of what 5.4.5 offers here. the 6.0 api `createProgram` does raise TS5101 (`baseUrl`) and TS5107 (`Node10`) in two in-memory tests; they now model the shipped shape (`Node16`, absolute `paths`), and all 1605 integration tests pass. residual: the compat package pins `@typescript/old` by caret (`npm:typescript@^6`), so a 6.x minor rides in unpinned.
- where: `5.1.execution.from_vision.yield.md` · break list.
- verdict: —
