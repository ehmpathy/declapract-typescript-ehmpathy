# F29 — each changed test intent is the change a queued issue or a prior review asked for

## .the fork
- (a) restore each prior assertion, fixture, and snapshot the r12 test-intent review named, and hand each change to the director one at a time
- (b) keep each change, since each is the behavior a queued issue in #781–#811 reported as a defect, or the blemish a prior review round of this stone named; the wish asks that each fix land and name its issue

## .taken — (b)
each named change is a requirement change, not a loosened test. the old assertion pinned the defect the issue or the review reports. ordinals follow the i003 r12 given:

| r12 point | the change | who asked | the proof it holds |
|---|---|---|---|
| blocker.1 | a local call job's `id-token: write` grant is judged by its callee; any other job that grants it and mints none is still named | the `test-passed` gate the upgrade merge needs (case=2, F24, F26) moves the suite into a call job | `workflowJobScopeIdToken` [case1] [case3] [case4] [case5]: a call into another repo is still named; bite proven |
| blocker.2 | `.agent/repo=.this/` suites run again; `.agent/` minus that dir stays ignored | #811 (F3, F14) | `jest-testmatch` integration test: each of six configs lists a `.agent/repo=.this/` suite and no other `.agent/` path |
| blocker.3 | the psql and aws fixtures carry the numeric `status` a real failed exec carries; any other fault rethrows; the one catch-all assert splits into absent and stall cases; the probe error is a tree | #788 #787; i002 r11 | `catch-cause-narrowed` [case1] runs the real aws cli; `testdb-preflight-branches` runs real psql against a real postgres |
| blocker.4 | the timestamp halt names `file:line`, never the line text; the malfunction leaf reads `file:` | #802; i002 r11 | the line may hold a key, and this halt prints before the secrets scan |
| blocker.5 | the secrets halt leaf reads `file:` | i002 r11 | the leaf label matches each peer halt |
| blocker.6 | the lock halt for a staged edit with disk reverted reads "stage it" with `git add`; the `fatal:` line is cut | #810 #789; i001 r6 | the prior text told a human to revert a hook that was already intact on disk |
| blocker.7 | the ACCESS message drops "for a cloud acceptance run"; each message carries its context block | #788; i002 r11 | the real `ConstraintError` renders its metadata; the shorter line names the same two levers |
| blocker.8 | the slow-test report ranks only files that ran a test | #788.1 | a skipped shard reported drift and turned ci red; the duration-only shape is no shape jest 30 emits |
| blocker.9 | the plan runs in `production-on-main` on main and tags; clear removes only this checkout's project | #785; #805 #807 | the old plan env read the apply env as absent on the first merge; the old clear evicted a neighbor repo's testdb |
| (i004 only) | the `start:livedb:prep` wake step runs after `build` | #794.5 | a wake before a build past 300 s lets prep nap again before the tests connect; after `build`, the wake sits right before the tests. the snap shows the step moved, never dropped |

the i004 r12 given renumbers the same changes: its blocker.9 is row 2 above, blocker.10 row 3, blocker.11 row 8, blocker.12 row 1, blocker.13 and blocker.14 row 9, blocker.15 the i004-only row. its blocker.1–8 are message rewords, held under F32.

## .rework — clean
each row reverts on its own: restore the old assertion and fixture. no contract downstream depends on the new text

## .confidence — 88%
the issues name each defect, and the director approved the wish. low only because each row is a reversal of a pinned behavior that a human has not yet read row by row

## .where
- `.reviews/peer/5.3.verification._.review.i002.3b2023e228a8f3de64.r012._.given.by_peer.enroll-verif-test-intent.md`
- `.reviews/peer/5.3.verification._.review.i003.6a68eabe7f976e3d8c.r012._.given.by_peer.enroll-verif-test-intent.md`
- `.reviews/peer/5.3.verification._.review.i004.c1ab77fe5a2b2a5424.r012._.given.by_peer.enroll-verif-test-intent.md`

## .verdict
open — fulcrum council at the end of the route
