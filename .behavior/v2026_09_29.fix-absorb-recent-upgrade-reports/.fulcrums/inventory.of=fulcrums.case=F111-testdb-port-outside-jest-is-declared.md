# F111 — outside jest, the app dials the declared testdb port unless `TESTDB_PORT` is exported

- **fork:** the app in a linked worktree, under test access but outside jest (`npm start`, a local
  command). (a) the prod connection derives the per-worktree port itself, as before; (b) the prod
  connection honors only the `TESTDB_PORT` override, so outside jest it dials the declared port
  unless a human exports `TESTDB_PORT`.
- **taken:** (b). (a) needs git and `child_process` inside the lambda artifact, the very copium
  this round removes (`rule.forbid.copium`, `rule.forbid.test-assets-in-src`). the schema
  provisioner (`connection.config.js`) and `compose.sh` run outside the artifact, so they still
  derive the worktree port from the test asset, and the testdb they start binds it.
- **cost:** a human who runs the app by hand in a linked worktree, with test access, must export
  `TESTDB_PORT`. otherwise the app dials the declared port, finds no db there or finds the main
  checkout's db, and fails loud on connect. jest runs are unaffected: the jest env declares the
  override.
- **rework:** clean. a repo that wants (a) back can export `TESTDB_PORT` from its start command.
- **confidence:** 80%. the hand-run app in a linked worktree is rare. a start-command export may
  be owed later.
- **where:** `P/persist-with-rds/best-practice/src/utils/database/getOneDatabasePort.ts`.
- **verdict:** —
