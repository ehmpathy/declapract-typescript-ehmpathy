# rule.forbid.copium

## .what

**copium** = a workaround that copes with a broader defect, lazily, where the defect lives. it
treats the symptom in the place that feels it, not the cause in the place that owns it.

forbid copium. above all when the root cause is **ownership**: the concern belongs to another repo,
another practice, or another layer. fix it at the owner, or dispatch it to the owner. never ship a
patch in a non-owner that copes with it.

## .why

- **a coped defect stays open at its source.** the owner never learns of it, so every other
  dependent meets it again and copes again. N repos, N patches, one live defect.
- **copium creates a second owner.** two places now act on one concern; they drift, and each
  reads the other's output as truth. the ownership defect is now worse than before.
- **copium ships into a place that cannot verify it.** the non-owner does not run the step it
  copes with, so it cannot test the workaround against the real thing. it rots unseen.
- **copium leaks into the wrong artifact.** a test need coped with in prod code ships test
  machinery to prod; an infra step coped with in a service template ships infra ops to every
  service.

## .the test

> **who owns the cause? is this change in that place?**

- the cause is here, and this place owns it → fix it here
- the cause belongs to another repo, practice, or layer → fix it there, or dispatch a task there.
  here, at most, consume what the owner provides
- a fix here would work, but only because it copes with a gap there → copium. stop

tells: *"it is easier to add it here"* · *"they may not do it"* · *"the service just needs to…"*
· a file that runs a step this repo never performs · a prod path that branches on a test need.

## .examples

### 👎 copium — an infra step shipped in a service practice

persist-with-rds shipped `after_major_upgrade.sql` (`ALTER EXTENSION … UPDATE`, then `ANALYZE`),
to run by hand after a postgres major upgrade. but the major-version cutover is performed by
ahbode/infrastructure, which already owns it: its aurora-upgrade route carries the per-database
extension update sql and records the post-apply extension updates as its own step.

### 👍 at the owner

the repo that owns the cutover owns its post-upgrade ops. the practice drops the file. a service
consumes the upgraded cluster; it does not operate the upgrade.

### 👎 copium — a test need coped with in prod code

the prod `getOneDatabaseConnection` imported a per-worktree testdb port util — git and
`child_process` calls inside the lambda artifact — to cope with a test-harness need: each worktree
binds its own testdb port.

### 👍 at the owner

the test harness owns the testdb. a jest env (`jest.*.env.ts`) derives the worktree port and
declares it as `TESTDB_PORT`; the prod connection honors that override only with test access. the
testdb utils live in a `.test/assets/` dir, never in a prod path.

## .enforcement

- a workaround in a non-owner for a defect whose owner is elsewhere = **blocker** (fix at the
  owner, or dispatch to it)
- a file that performs a step another repo owns and performs = **blocker**
- a prod path that carries test machinery to cope with a test need = **blocker**
- a workaround kept for a cause already fixed at its owner = **nitpick** (delete it)

## .see also

- `rule.require.solve-at-cause` (ehmpathy/architect) — diagnose root cause before you solve
- `rule.require.entool-requests-as-practices` — the practice that creates the artifact owns it
- `rule.forbid.test-assets-in-src` — test-only assets stay out of prod paths
- `rule.forbid.overgranular-maintenance-farms` — the kin forbid on ops a practice should not ship
