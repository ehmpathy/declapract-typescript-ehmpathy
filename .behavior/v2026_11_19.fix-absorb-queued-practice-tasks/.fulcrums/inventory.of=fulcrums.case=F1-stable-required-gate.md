# F1 — one stable required check, so a job rename never strands an upgrade pr

## .the fork
- a: keep the declared contexts a union of old and new names for one release (#781 option 2)
- b: a pract check / route step that tells the adopter to apply the github wish before merge (#781 option 1, #782)
- c: one aggregate gate job (`test-passed`) that `needs:` the suite; branch protection requires it plus `pullreq-title`, and no longer names inner jobs

- d: for one release, the gate also posts commit statuses under each legacy context name (`test-commits`, …), derived from the real suite result, so pre-#257 protection sees its names. rejected: it needs `statuses: write`, and a check that reports a name no job holds is a decode puzzle for every reader of the checks list

## .what it cures, and what it does not
the gate cures the class: every rename after it. it does not cure the case #781 reported (svc-images, protection from before #257). that case keeps one hand apply before merge.

## .taken
c. a union cannot work: a required context that never reports blocks the merge, so the old names still strand the pr. b is a hint, not a cure, and lives in another repo's upgrade route. c decouples protection from job names at the cause: the inner `suite / test-*` names still report in this release, so the first upgrade merges under the old protection, and `github / apply` on main then moves protection to the gate. every later rename (#791, #801) is free.

## .rework
clean. the gate is one job in `test.yml` and one context list in `resources.ts`; a revert restores both.

## .confidence — 80%, why not higher
- an adopter still on the pre-`suite /` names (`test-commits`, …) stays stuck for this one upgrade; the gate cannot report under names the old protection wants. the `suite /` names shipped in #257 and #272 (2025-12), so this set is repos ~11 months behind (svc-images was one). it gets the apply command in the readme and the issue reply; its stranded pr stays silent (inventory e22)
- the gate must name each failed suite job, or every red pr costs the reviewer a hunt (inventory e21)
- `if: always()` + a `needs.*.result` check must treat a skipped acceptance as pass and a cancel as fail; verified in execution

## .where
`src/practices/cicd-common/best-practice/.github/workflows/test.yml`, `src/practices/provision-github/best-practice/provision/github.repo/resources.ts`

## .verdict
— (awaits review)
