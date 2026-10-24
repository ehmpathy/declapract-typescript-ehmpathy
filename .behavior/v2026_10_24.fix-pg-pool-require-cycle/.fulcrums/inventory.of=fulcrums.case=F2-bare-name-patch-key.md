# F2: the patch map key is the bare name

- fork: `pg-pool@3.14.0` (as the downstream repo did) · `pg-pool@^3` · `pg-pool`
- taken: `pg-pool`. an exact key goes stale on the next bump, and `stale-patched-dependency` then deletes it, so the
  cycle returns. the bare name is never judged stale and covers every release
- rework: clean — a key rename
- confidence: 90%. pnpm 10.34.5 support for bare-name keys is documented but not yet seen in a real install; the test
  install verifies it. a range key is the fallback if it fails
- where: `persist-with-rds/best-practice/package.json`
- verdict: —
