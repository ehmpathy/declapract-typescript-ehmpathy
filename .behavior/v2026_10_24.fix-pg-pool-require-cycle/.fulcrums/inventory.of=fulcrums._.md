# inventory.of=fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | cure = shipped patch, not an exclusion or pin | clean | best-guessed | 95% |
| F2 | patch map key = bare name `pg-pool`, not `pg-pool@3.14.0` | clean | best-guessed | 90% |
| F3 | home = persist-with-rds, not lint | clean | best-guessed | 90% |
| F4 | clamp = a cycle check step in the usecase walk | clean | best-guessed | 85% |
| F5 | walk `[t3]` asserts no pg-pool cycle + snapshots the rest, not `exits 0` | clean | best-guessed | 80% |
| F6 | `.husky/` mode flips stay out of this pr; no hook refactor | clean | best-guessed | 95% |
| F7 | route artifacts keep their mandated shapes (evaluation table, confidence column) | clean | best-guessed | 85% |
| F8 | defer the scheduled clamp run and the named throw to dreams | clean | best-guessed | 85% |
| F9 | two-site test infra stays wet, not lifted to `src/utils/` | clean | best-guessed | 85% |
| F10 | clamps stop at the shipped path; adjacent cells (pg-pool 2.x, a dep's direct pool) stay unbuilt | clean | best-guessed | 85% |
| F11 | "built on rhachet 1.50.1" = this repo's build tools; the shipped rhachet floor stays 1.49.2 | clean | best-guessed | 75% |
| F12 | the patch header keeps the fix text, though an edit re-locks every adopter | clean | best-guessed | 80% |
| F13 | adopter journeys proven at the declapract integration grain; no new acceptance suite | clean | best-guessed | 85% |
| F14 | the walk skill's `7.cycles` branch is proven by real runs, not a snapshot | clean | best-guessed | 80% || F15 | extant test shapes this pr only appends to stay as they are (caselist; console capture) | clean | best-guessed | 85% |