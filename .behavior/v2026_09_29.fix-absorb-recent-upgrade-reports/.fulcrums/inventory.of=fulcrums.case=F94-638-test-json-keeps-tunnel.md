# F94 — #638: `test.json` keeps `tunnel.bastion` + `tunnel.cluster`, on the shared cluster variable

- **fork:** (a) drop `bastion`/`cluster` from `config/test.json`, as the research for #539 proposed
  (`refs/research.open-before-window.batch-c.md:179`); (b) keep them in all three configs, with
  test's `cluster.name` on the same `@declapract{variable.databaseClusterName}` as prep and prod.
- **taken:** (b). the config practice's divergent-config-shapes check flags a key that one of
  test/prep/prod holds and the others lack, so (a) would trip it on every adopter. the test config
  reaches its database at `localhost:7821` and never opens a tunnel, so the shared value is read by
  no code under `test`. the deep merge (#539 7c) is what keeps a repo's own values, and it holds
  under either branch.
- **rework:** clean — drop two keys from one template, plus an exemption in the shape check.
- **confidence 75%, low because:** a reader of `test.json` may take the cluster name as the one the
  test suite reaches.
- **where:** `persist-with-rds/best-practice/config/test.json:23-33`.
- **verdict:** —
