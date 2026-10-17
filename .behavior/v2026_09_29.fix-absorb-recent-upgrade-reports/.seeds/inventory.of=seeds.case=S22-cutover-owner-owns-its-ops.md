# S22 — the repo that owns a cutover owns its follow-up ops; copium is forbidden

## .said

> isnt this already handled by ahbode/infrastructure? src/practices/persist-with-rds/best-practice/provision/schema/sql/upgrade/after_major_upgrade.sql ; i.e., the infrastructure repo that owns the cutover should own the db upgrade operations too

> enrule that generally

> to forbid copium when rootcause is ownership

> copium is workarounds to cope with broader defects lazily

## .settled

- the repo that performs a cutover owns the operations that follow it. a postgres major upgrade is
  performed by the infrastructure repo, so the post-upgrade extension updates and `ANALYZE` are its
  ops, not a service practice's.
- copium is a workaround that copes with a broader defect lazily, in the place that feels it rather
  than the place that owns it. it is forbidden; above all where the root cause is ownership, the fix
  lands at the owner or is dispatched to it.

## .landed

- `src/practices/persist-with-rds/best-practice/provision/schema/sql/upgrade/` removed
- `src/practices/persist-with-rds/engine-upgrade.declapract.integration.test.ts` + fixture
- `.agent/repo=.this/role=any/briefs/rule.forbid.copium.md`
- F105; `release.commits.md` #664; inventory row 664
