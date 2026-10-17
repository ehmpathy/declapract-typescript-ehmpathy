# F13 — #617: acceptance runner detected by config prefix

- **fork:** a declared input on the reusable `.test.yml` workflow, or detect the runner from which
  config file exists (`play.acceptance.config.*` → playwright, else jest; both → exit 2).
- **taken:** detect by prefix, via a `detect-test-runner.sh` step; jest steps gated on
  `runner == 'jest'`; tests-any/tests-node/tests-expo acceptance checks pass when the play config
  exists. a declared input would need every caller workflow to pass it — a second place to drift.
- **rework:** clean — the detector is one step.
- **confidence 65%, low because:** the carve-out in three practices' checks is new ground; upstream
  rhachet-roles-ehmpathy#764 may want its own contract.
- **where:** `cicd-common/best-practice/.github/workflows/.test.yml`; tests-* acceptance checks.
- **verdict:** held by the wisher (seed S3) — #617 waits with the playwright work.
