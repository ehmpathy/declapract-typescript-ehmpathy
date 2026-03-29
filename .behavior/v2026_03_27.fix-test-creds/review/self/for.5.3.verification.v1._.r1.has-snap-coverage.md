# self-review r1: has-snap-coverage

## the question

does every new public contract have snapshot coverage?

---

## what is a "public contract" in this behavior?

this behavior modifies internal declapract declarations, not public CLI commands or SDK methods. there are no new public contracts introduced.

**what changed:**
- keyrack.source() — this is a call to an external library (rhachet), not a new contract we define
- buildWorkflowSecretsBlock() — internal utility, not a public contract
- jest env files — internal test infrastructure
- bad-practice files — internal declapract declarations

**public contracts would be:**
- new CLI commands with stdout/stderr
- new SDK methods with documented responses
- new API endpoints

none of these were introduced.

---

## snapshot coverage assessment

| contract | type | snapshot needed? | status |
|----------|------|------------------|--------|
| keyrack.source() | external library call | no (not our contract) | n/a |
| buildWorkflowSecretsBlock() | internal utility | yes (has extant snapshots) | covered |
| bad-practice fix functions | internal declapract | no (unit tests suffice) | n/a |

---

## why it holds

1. no new public contracts were introduced
2. the only testable output (workflow yaml) already has snapshot coverage
3. the snapshot files were modified, not added
4. this behavior is internal infrastructure, not user-visible output

