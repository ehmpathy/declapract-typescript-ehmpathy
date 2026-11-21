# F24 — the `test-passed` gate and the protection flip ship on github's documented contract, before a live run

## .the fork
- a: prove the gate on a live github run in a sandbox repo (green, one job failed, one cancelled) before release
- b: stage the flip: ship the gate as a report this release; flip protection to it next release
- c: ship gate and flip together (F16) on the documented contract, clamped per branch, with the recovery named in the pr body

## .taken
c. the green path rests on two documented facts, not on inference:
- github docs, contexts: the `jobs` context "is only available in reusable workflows, and can only be used to set outputs for a reusable workflow"; `jobs.<job_id>.result` is one of `success`, `failure`, `cancelled`, `skipped`. `.test.yml` sets each `result-<job>` output from exactly that
- github docs, reuse workflows: a caller reads them as `needs.<job>.outputs.<name>`; the gate reads `toJSON(needs.suite.outputs)`

the verdict rests on the roll-up, `needs.suite.result`; the per-job outputs only name a red, and a job result that reads `failure` or `cancelled` reds the gate even on a green roll-up. `[case1]` clamps the wire (each job's output, the step's env); `[case2]`–`[case8]` clamp each verdict. a live sandbox run needs a new github repo, an outside act no stone grants. staged, the flip leaves #781 #782 (an upgrade trip each adopter pays by hand) open one more release.

the two wire faults, weighed:
- empty outputs on a green suite: the gate passes, with a github warn annotation (`no job result reached the gate`). a halt here would red every pr of every adopter with no local fix, the "check that can never pass" this release cures, so the gate never vetoes a green on absent names
- a green roll-up over a failed inner job, with empty outputs too: the gate would pass a red suite. it needs two faults at once, each against the documented contract, and the first adopter upgrade pr (the canary, F16) shows the warn annotation if the names ever go absent

recovery: the warn annotation names the absent wire on the canary pr; the protection's own apply command (in the provision-github readme and beside the contexts in `resources.ts`) restores any context list in one run. the pr body names both.

## .rework
clean. to stage the flip is one line in `resources.ts` in the next release.

## .confidence — 80%, why not higher
no live run; a github behavior change in reusable-workflow outputs would surface on every adopter at once.

## .where
`cicd-common/best-practice/.github/workflows/{test,.test}.yml`, `provision-github/.../resources.ts`; the first adopter upgrade pr is the first live run, and its result is checked before the release reaches the rest

## .verdict
— (awaits review)
