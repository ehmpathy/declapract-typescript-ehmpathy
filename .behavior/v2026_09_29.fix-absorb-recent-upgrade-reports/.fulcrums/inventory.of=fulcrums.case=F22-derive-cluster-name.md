# F22 — #638: derive the cluster name; the override variable is optional

- **fork:** a required `@declapract{variable.databaseClusterName}`, or derive the name from the
  first label of `databaseClusterHost.<env>` with an optional `databaseClusterName` override read
  from `context.projectVariables` in a `contents` fn.
- **taken:** derive + optional override. a required variable makes `plan` throw
  `Variable … was not defined` for every adopter that has not declared it (the F5 concern); the
  first label of an RDS cluster endpoint is the cluster identifier.
- **rework:** clean — the contents fn is one file per env.
- **confidence 80%, low because:** a cluster reached through a custom dns alias has no identifier in
  its first label; the override covers it.
- **where:** `persist-with-rds/best-practice/config/{prep,prod}.json.declapract.ts`.
- **verdict:** —
