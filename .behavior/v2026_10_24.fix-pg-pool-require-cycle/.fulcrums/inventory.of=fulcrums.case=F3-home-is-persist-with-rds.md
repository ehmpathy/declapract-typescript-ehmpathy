# F3: the patch lives in persist-with-rds

- fork: `lint` (owns the cycle check) · `persist-with-rds` (ships pg)
- taken: persist-with-rds. per `rule.require.entool-requests-as-practices`, the practice that causes the artifact to
  exist declares the rule for it; pg drags in the cycle, and only rds repos install pg
- rework: clean — a file move between two best-practice dirs
- confidence: 90%
- verdict: —
