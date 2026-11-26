# F3 · drop importsNotUsedAsValues; do not swap in verbatimModuleSyntax

- fork: replace `"importsNotUsedAsValues": "remove"` with `verbatimModuleSyntax: true` (its named successor), or delete it.
- taken: delete. `remove` is already the default elision. `verbatimModuleSyntax` under `module: node16` in a commonjs package rejects esm `import` syntax, which would break every source file in a cjs repo.
- rework: clean. one tsconfig key.
- confidence 93%: the typescript 5.0 release notes state both facts. the option was removed in 5.5, and `verbatimModuleSyntax` errors where esm `import`s would emit as `require`. the residual risk: 7.0.2 behavior is not yet run here; the 6.0.3 rung shows it.
- where: `1.vision.yield.md` · case=3.
- verdict: overturned in part by peer review r011 (i004, blocker.1). the drop holds for `"remove"` alone; `"preserve"` emits a `require` for each type-only import and `"error"` polices them, so a drop of either changes the build in silence. the automatic fix now drops only `"remove"`; `preserve` and `error` are the manual bad-practice `imports-not-used-as-values-kept`, whose readme names a side-effect import or `verbatimModuleSyntax` (esm only).

