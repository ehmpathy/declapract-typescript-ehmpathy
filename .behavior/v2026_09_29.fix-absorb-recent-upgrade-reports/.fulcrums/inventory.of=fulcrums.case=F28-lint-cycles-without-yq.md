# F28 — #601/#616/#628: node + `yaml` replace `yq`

- **fork:** declare `yq` as a host requirement, vendor a yq npm package, or read `.dpdmrc.yaml`
  with node + the `yaml` lib; and whether `.dpdmrc.yaml` stays EQUALS.
- **taken:** node + `yaml` (2.9.1 devDep, depcheck-ignored), fail-closed with `&&`, which also
  deletes #616's dead `// "^$"`. `.dpdmrc.yaml` gets a check that passes any `exclude` array without
  `node_modules` and a fix that writes only when absent — EQUALS today deletes the adopter entries
  the policy itself allows (#628).
- **rework:** clean — one npm command, one declaration.
- **confidence 75%, low because:** a relaxed check lets an adopter add a wrong entry; the comment
  scopes the policy and the reviewer holds the line.
- **where:** `lint/best-practice/{package.json:13,.dpdmrc.yaml,.dpdmrc.yaml.declapract.ts}`.
- **verdict:** —
