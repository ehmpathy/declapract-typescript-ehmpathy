# F1: the cure is a shipped patch

- fork: exclusion in `.dpdmrc.yaml` · version pin of pg-pool · shipped patch
- taken: shipped patch. an exclusion of a prod dep is a blocker under `rule.forbid.dpdm-exclude-change`; a pin cures
  naught, since the fallback is in pg-pool 2.0.0, 3.6.0, and 3.14.0
- why a patch that drops the edge, over one that hides it: a hunk such as `(0, require)('pg')` keeps the runtime
  fallback and only blinds dpdm to it. that games the analyzer the `.dpdmrc.yaml` policy trusts: the edge would
  still run, just unseen, which is the exclusion's defect in a subtler form. the drop costs a direct `pg-pool`
  caller one `Client` option (named in the header, clamped per release); the hide would empty the policy
- rework: clean — one file and one package.json key; a swap to another cure touches no caller
- confidence: 95%. low only in that the wisher could still prefer a policy amendment over upkeep of a patch
- where: `src/practices/persist-with-rds/best-practice/`
- verdict: —
