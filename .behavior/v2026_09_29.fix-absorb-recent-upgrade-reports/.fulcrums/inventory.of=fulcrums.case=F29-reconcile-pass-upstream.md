# F29 — #607: remove the conflicts here; file the leftover report upstream

- **fork:** build a post-fix reconciliation pass in this repo, or remove the causes of FIX_MANUAL
  here (the #630 multi-declarer conflicts, fix-less checks, a text-contains check whose union fix is
  a no-op) and file the report-leftovers ask on ehmpathy/declapract plus a plan-after-apply step on
  rhachet-roles-ehmpathy's `declapract.upgrade`.
- **taken:** the latter. the gate that leaves a fix unapplied lives in declapract core
  (`getRequiredActionForFile.js:16`); a pass in a practice repo cannot see core's plan. this repo
  adds a test that every declaration's `check(fix(x))` passes on representative adopter input.
- **rework:** clean.
- **confidence 80%, low because:** app-protools-native's exact unapplied file is inferred (55% the
  `test.yml` double claim), not reproduced.
- **where:** see F6; upstream issues filed by the driver.
- **verdict:** stands, but the upstream asks are caught dreams, not filed issues (seed S5).
