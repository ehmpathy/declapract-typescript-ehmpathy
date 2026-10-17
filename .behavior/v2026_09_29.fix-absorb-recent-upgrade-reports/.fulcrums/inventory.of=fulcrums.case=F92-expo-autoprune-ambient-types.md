# F92 — F88/expo: an ambient `test-fns.autoprune.d.ts`, not a moduleResolution switch

## .the fork

- **A:** ship an ambient `declare module 'test-fns/autoprune.setup.jest'` in tests-expo, with a
  signature that mirrors the real one, until test-fns adds `typesVersions`.
- **B:** set `moduleResolution: "bundler"` in the typescript-expo tsconfig, so `exports` subpaths
  are read.
- **C:** raise the expo floor to 54, whose `tsconfig.base` already uses `bundler`.

## .taken

A. it touches one new file and no adopter's compile mode. B changes how every import in an expo app
compiles (and needs `module` to match); C forces a major expo upgrade on every adopter. both are
large ripples to fix one subpath's types. the d.ts states when to remove it.

## .rework

clean. delete the d.ts once test-fns ships `typesVersions` (reseed dream), or once the expo floor is 54.

## .confidence

80% — the ambient signature could drift from test-fns' real one; the integration test compiles both
prepare templates against it, so a drift that breaks a call is caught.
