# F61 — #687: a wide paths gate, shipped with #685's fix fn

- **fork:** (a) the issue's list (provision/**, the workflow callees, package.json, lockfile);
  (b) that list plus `config/**`, `src/utils/config/**`, `src/utils/environment.ts`.
- **taken:** (b). the schema plan reads the config through `connection.config.js:6-9`, so a narrow
  gate lets schema drift merge unplanned; a wide gate costs a few extra plans. it ships with #685,
  since without that fix fn a new `paths:` line reds every adopter's check with no convergence.
- **rework:** clean — a list edit.
- **confidence 70%, low because:** the payoff is zero until a cluster runs at min 0.
- **where:** `cicd-service/best-practice/.github/workflows/provision.yml`.
- **verdict:** ruled against (S18) — overkill. the gate is dropped; `pull_request:` stays bare and
  #687 closes as not planned. a hand-kept list of every adopter's plan inputs is a maintenance farm
  (`rule.forbid.overgranular-maintenance-farms`).
