# F4 · rungs = 5.4.5 · 6.0.3 · 7.0.2 · 7.0.2 single-thread, on one migrated tsconfig

- fork: compare only 5.4.5 vs 7.0.2, each on the tsconfig it accepts; or run all rungs on one migrated tsconfig, plus 6.0.3 and a single-thread 7.0.2.
- taken: four rungs, one tsconfig. the migrated tsconfig (no baseUrl, prefixed paths, explicit types, no importsNotUsedAsValues) is valid on 5.4.5, so config drops out as a variable. 6.0.3 surfaces deprecations with codes (microsoft: clean on 6.0 ⇒ same on 7.0). `--singleThreaded` splits the native gain from the parallel gain, which the wish's wall-vs-cpu read needs.
- rework: clean. a rung is a table row.
- confidence 90%.
- where: `1.vision.yield.md` · the measurement.
- verdict: —

