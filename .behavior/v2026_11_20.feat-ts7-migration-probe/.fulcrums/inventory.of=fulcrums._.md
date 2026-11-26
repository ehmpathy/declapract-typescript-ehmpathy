# inventory.of=fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | measure on this repo, not a larger consumer | clean | ruled: as taken | 75% |
| F2 | raise the floor in typescript-node, not typescript-any | clean | ruled: as taken | 88% |
| F3 | drop importsNotUsedAsValues; do not swap in verbatimModuleSyntax | clean | superseded: removed at any value (seed S2) | 93% |
| F4 | rungs = 5.4.5 · 6.0.3 · 7.0.2 · 7.0.2 single-thread, on one migrated tsconfig | clean | best-guessed | 90% |
| F5 | "holds" = every break has a shipped fix valid on 5.4.5 too, ci green, wall not slower | clean | ruled: as taken | 80% |
| F6 | read the compiler api via `@typescript/typescript6`, not the `typescript` peer | clean | best-guessed | 85% |
| F7 | the ts7 bad-practice fixes whole; no manual part for moduleResolution or a lone baseUrl | clean | superseded: whole, no manual part at all (seed S2) | 88% |
| F8 | the decode-friction in two extant utils stays out of this pr | clean | best-guessed | 90% |
| F9 | the probe and walk skills ship with hand proofs, not a snapshot suite | clean | best-guessed | 85% |
| F10 | drop the self-devDependency that rode in with the rhachet bump | clean | best-guessed | 88% |
| F11 | the probe skill stays one file; the walk→probe path stays a two-site contract | clean | best-guessed | 82% |
| F12 | the rhachet bumps ride in this pr | clean | best-guessed | 90% |
| F13 | lift only the jsonc reader; the fold-specific steps stay in the bad-practice | clean | superseded: fold cut (seed S2) | 85% |
| F14 | a nested baseUrl folds to one named lookup key per entry, not a `"*"` catch-all | clean | superseded: fold cut (seed S2) | 80% |
| F15 | dispose the two prose lanes by inferred ordinal; dispute only the one point whose ordinal is sure | clean | best-guessed | 70% |
| F16 | the tsconfig best-practice fix writes plain json; no comment-safe splice rewrite in this pr | clean | best-guessed | 75% |
| F17 | the expo tsconfig `baseUrl` stays out of this pr | clean | best-guessed | 80% |
| F18 | `asJsonMergedDeep` keeps two required rule callbacks, not a `rules` object of `fn \| null` | clean | best-guessed | 80% |
| F19 | the nested-`baseUrl` fold stays automatic in this pr; its disk-read test moves to integration grain | clean | superseded: fold cut (seed S2) | 75% |
| F20 | the extant integration tests in other bad-practice dirs stay put; only this pr's own move | clean | best-guessed | 85% |
| F21 | the manual-fix stderr notice stays until declapract prints practice readmes | clean | superseded: no manual part left (seed S2) | 80% |
| F22 | the plan snapshots keep declapract's plan output whole | clean | best-guessed | 90% |
| F23 | the root `.husky/check.lockfile.sh` lands the husky practice template, byte for byte | clean | best-guessed | 90% |
| F24 | the one alias anchor is `@src/`; the root `@/*` leaves | dirty | best-guessed | 75% |