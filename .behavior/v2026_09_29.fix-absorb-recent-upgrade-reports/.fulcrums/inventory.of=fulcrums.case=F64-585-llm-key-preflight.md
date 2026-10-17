# F64 — #585: where the LLM provider key preflight lives

- **fork:** (a) a `preflight` job in the `.test.yml` template that checks a provider→key map before
  the shards fan out; (b) wait for a `keyrack firewall --verify` in rhachet.
- **taken:** (a). published bytes only (S5); one EQUALS template reaches every adopter.
- **rework:** clean — one job; swap to (b) once rhachet ships it.
- **confidence 70%, low because:** the provider map may drift from the brains an adopter enrolls.
- **where:** `cicd-common/best-practice/.github/workflows/.test.yml`.
- **verdict:** ruled against (S18) — neither fork. a rejected key is the test suite author's to
  detect, or keyrack's to healthcheck, never ci's. the job and `preflight-keys.sh` are dropped; #585
  closes as not planned; a keyrack healthcheck task goes to rhachet
  (`rule.forbid.key-health-checks-in-cicd`).
