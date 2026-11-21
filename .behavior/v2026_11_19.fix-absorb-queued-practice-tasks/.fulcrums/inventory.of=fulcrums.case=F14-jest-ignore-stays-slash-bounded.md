# F14 — the jest `.temp` and `.agent` ignores stay slash-bounded, with no `(^|/)` anchor

## .the fork
- a: rewrite each ignore as `(^|/)\.temp/` (and the same for `.agent`), per the r7 i003 nitpick.1 claim that `/\.temp/` matches `.temp` anywhere
- b: keep `'/\\.temp/'` and `'/\\.agent/(?!repo=\\.this/)'`

## .taken
b. jest matches each ignore against the absolute path, which always starts with `/`. so the slash before the name already anchors it to a segment start, and the slash after anchors its end. `/src/.templates/`, `x.temp.test.ts`, and `/src/.agentic/` cannot match. `(^|/)` would add no reach and would diverge from jest's own `/node_modules/` idiom. clamp rows in `tests-any/jest-testmatch.declapract.test.ts` hold all three non-matches for all six configs.

## .rework
clean. one string per config, six configs.

## .confidence — 92%, why not higher
a jest `rootDir`-relative match mode, if one is ever set, would hand the pattern a path with no slash in front. no practice sets one today.

## .where
`src/practices/tests-{node,expo}/best-practice/jest.{unit,integration,acceptance}.config.ts`

## .verdict
reworked. the slash bound holds within the root (r7 i003 nitpick.1 stays disputed), but r11 i004 found the case this entry missed: a checkout whose own root sits under another dir's `.temp/` or `.agent/` had every suite skipped. each ignore is now anchored at `<rootDir>/`, as `modulePathIgnorePatterns` already was. the `repo=.this` lookahead also accepts the bare dir (`(/|$)`), since jest's crawler tests a dir with no slash at its end and the `/`-only form pruned `.agent/repo=.this/` whole. a real `jest --listTests` run under this repo's `.temp/` clamps both.
