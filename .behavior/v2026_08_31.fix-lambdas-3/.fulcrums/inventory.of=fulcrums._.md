# fulcrums — v2026_08_31.fix-lambdas-3

design forks best-guessed mid-drive and deferred to the end council. each row links its entry.

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | deploy.database.sh cicd db-user model under the plan/apply credential split | dirty | open | 55% |
| F-jest-env-mutation-strategy | how the jest acceptance env applies AWS creds (in-place splice vs fresh record) | clean | open | 70% |
| F-d31-fanout-sequence | when the shared .deploy-sls.yml acceptance fan-out lands (now vs endpoint) | dirty | open | 65% |
| F-4b-rename-sequence | when the environment export `stage` → `access` rename lands (now vs endpoint) | dirty | resolved (option A landed — `rule.forbid.stage-term` forbids the bridge) | 70% |
| F-review-brain-swap | all 9 l1 peer lanes swapped to `anthropic/claude/code` (CLI-routed) — off the suspended fireworks default and the broken xai adapter | clean | open | 70% |
| F-serverless-soft-skip-convergence | a non-default provider `timeout:` — force to 60, or relax the clamp (neutral `@declapract:review` marker ships meanwhile) | clean | open | 70% |
| F-config-host-tier-strategy | the config-host tier close — byte-preserve+CNAME-alias (decision 3) vs structural-token-swap; residual silent-wrong-tier window until the alias lands | dirty | open | 70% |
| F-stage-rule-vs-scaffold | reconcile forbid-stage rule with the dual-publish scaffold — amend the rule (took) vs strike the template's `accessByStage`/`deploymentBucketByStage` | clean | resolved (rule amended — `.the second allowed use` landed) | 75% |
| F-602-duration-source | slow-test report reads `endTime - startTime` (wall-clock span) vs a pinned jest reporter that emits per-file durations | clean | open | 70% |
| F-602-report-sink | report writes a ranked table to `$GITHUB_STEP_SUMMARY` + inline annotations vs an artifact upload vs both | clean | open | 65% |
| F-602-thresholds | the 30s/10s warn/notice thresholds are inherited from the prior report, unexamined | clean | open | 60% |
| F-budget-token-literal | boot.yml budget cap written `5000` not the wisher's `5_000` — yaml 1.2 reads underscore ints as strings | clean | open | 80% |
| F-budget-findsert-add | budget findserted into an extant consumer as a bare `tokens: 5000` key, no explanatory comment (findsert adds the key, not the template's comment block) | clean | open | 65% |
