# F105 — #664 item 6: the post-upgrade ops belong to the repo that performs the cutover

- **fork:** (a) ship `after_major_upgrade.sql` in persist-with-rds, derived from `.extensions.sql`;
  (b) ship none; the repo that performs the major-version cutover runs its own post-upgrade ops.
- **taken:** (b), ruled by the wisher (S22). ahbode/infrastructure performs the aurora major
  upgrade, and its upgrade route already records the per-database `ALTER EXTENSION … UPDATE` and
  carries that sql as its own post-apply step. a service practice that shipped the same ops would be
  a second owner of a step it never performs (`rule.forbid.copium`).
- **why not (a):** each service would hold a hand-run sql file for a cutover it does not run, could
  not test it against the real upgrade, and would drift from the copy the cutover owner runs.
- **cost:** the file never shipped (new this round), so no adopter carries it and no clean-up
  bad-practice is owed. #664 closes with items 1–5; item 6 is answered as owned elsewhere.
- **rework:** clean — the dir and its integration-test rows are removed.
- **confidence:** 95%, ruled.
- **where:** `src/practices/persist-with-rds/best-practice/provision/schema/sql/upgrade/` (removed);
  `src/practices/persist-with-rds/engine-upgrade.declapract.integration.test.ts`.
- **verdict:** ruled (b) by the wisher.
