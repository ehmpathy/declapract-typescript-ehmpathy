# F8: defer the scheduled clamp run and the named throw to dreams

- fork: in this pr, add a scheduled ci run of the clamp against the latest pg-pool, and replace the patched fallback
  with a stub that throws a message that names the patch · catch both as dreams
- taken: catch both. `.dream/2026_10_24.schedule-pg-pool-patch-clamp-against-latest.dream.md` and
  `.dream/2026_10_24.pg-pool-patch-named-throw-for-direct-callers.dream.md`, each linked from `$route/dreams/`
- why, the schedule: a new workflow in this repo's cicd is safe but not clean — it opens workflow permissions and an
  issue route, outside a cycle fix
- why, the named throw: not safe — it changes every direct caller's failure shape and grows the hunk, which widens the
  fit risk this round just narrowed to one context line each side. the current failure is loud
  (`this.Client is not a constructor`, now asserted across 24 releases) and the header + readme name the remedy
- why not a bad practice that flags `from 'pg-pool'` in adopter src at plan time: no shipped practice or dev tool
  imports pg-pool (`sql-schema-control`, `sql-dao-generator`, `sql-code-generator`, `sql-schema-generator` hold no
  pg-pool dep), so its only reach is hand code. a practice that scans every adopter's src to catch a rare,
  loud-at-first-connect break adds a check to every plan for a cell the header already teaches; it is a new
  practice surface, not a cycle fix. it joins the named-throw dream as the plan-time option
- rework: clean — each is additive; neither touches the shipped key or the merge
- confidence: 85%. a reviewer could read the named throw as owed by the wish's "no surprise" spirit
- where: `src/practices/persist-with-rds/best-practice/patches/pg-pool.patch`, this repo's `.github/workflows/`
- verdict: —
