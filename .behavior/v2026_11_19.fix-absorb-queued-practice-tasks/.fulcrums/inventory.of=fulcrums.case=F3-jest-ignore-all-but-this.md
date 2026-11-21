# F3 — jest skips every `.agent/` path except `.agent/repo=.this/`

## .the fork
- a: keep 0.50.0's `/.agent/` ignore (skips the repo's own `.agent/repo=.this/` suites — #811)
- b: ignore only `.agent/.actors/` and `.agent/.cache/` (#811's shape)
- c: ignore `.agent/` except `.agent/repo=.this/` — one regex, `/\.agent/(?!repo=\.this/)`

## .taken
c. b would run vendored role suites: this repo's `.agent/repo=ghlitch/` holds 21 `*.test.ts` today (symlinked into node_modules now; a copy would be walked). c matches the depcheck practice exactly (`.agent/repo=*` + `!.agent/repo=.this`), so one rule governs both tools.

## .rework
clean. one pattern per jest config.

## .confidence — 90%
jest compiles each pattern as a js regex, so the lookahead holds; a clamp proves it in execution.

## .where
`src/practices/tests-node/best-practice/jest.*.config.ts`, `src/practices/tests-expo/best-practice/jest.*.config.ts`

## .verdict
c stands, reworked. the first clamp copied jest's regex compile and never ran jest; r10 i004 asked for a run, and the run showed `(?!repo=\.this/)` prunes `.agent/repo=.this/` from the haste map, since the crawler tests the dir with no slash at its end. the lookahead is now `(?!repo=\.this(/|$))`, anchored at `<rootDir>/` (F14), and `[case-jest]` runs `jest --listTests` to prove it.
