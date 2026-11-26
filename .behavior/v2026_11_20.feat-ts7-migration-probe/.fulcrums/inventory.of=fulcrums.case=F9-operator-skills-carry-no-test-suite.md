# F9 · the probe and walk skills ship with hand proofs, not a snapshot suite

- fork: a peer review asked for snapshot + acceptance tests of `typescript.probe.sh` and the new `declapract.walk.sh` lines (`rule.require.contract-snapshot-exhaustiveness`, `rule.forbid.friction-hazards`). options:
  - (a) add a jest suite under `.agent/repo=.this/role=any/skills/`, and change the jest configs to reach it
  - (b) keep this repo's convention: operator skills under `.agent/` carry no test suite; prove each new branch by hand and record the proof
- taken: (b).
  - all three root jest configs set `testPathIgnorePatterns: [..., '/.agent/']`, and so does every jest template the tests-node and tests-expo practices ship. `.agent/` is excluded from test runs on purpose, here and in every adopter
  - none of the 9 skills in `.agent/repo=.this/role=any/skills/` has a test file. a suite could sit under `src/` and spawn the skill with no jest config change, so the config is no wall; the cost is a first-of-its-kind suite for one skill, apart from all its peers
  - these skills never ship to an adopter: they run only in this repo, by an operator, so the contract-snapshot rule's audience (a consumer of a published cli) is absent
  - the branches are proven: `--what bogus` and `--walk no-such-usecase` each print a `✋ ConstraintError:` with a fix and exit 2; the lock releases (a second run passes); a fresh install lands via a staged dir (5.9.3 smoke run); the typecheck and emit paths produced the yield's measurements and emit read
  - round 2 proved the new branches by hand too: `--rungs '5.4.5 ../x'` exits 2 with the fix; emit on a walked consumer and on this repo writes only under `.temp/`; a 1-run typecheck rung runs clean
- rework: clean. (a) is an added test file under `src/` that spawns the skill, no change to the skills.
- confidence 85%: the convention is explicit in config. residual: the probe is the richest of the 9 skills, so if the operator wants a regression net for it, that is its own pr across all `.agent` skills, not one.
- where: review r9 (ergo-friction-hazards) blocker.1, blocker.2; review r10 (enroll-impl-behavior-intent) friction table, last row.
- verdict: —
