# F38 — #664: the version-skew job lands, fails loud, and names its IAM grant

- **fork:** (a) hold the skew job until each adopter grants `rds:DescribeDBClusters` (work outside
  this repo, S5); (b) land the job; on a denied describe it exits red and names the grant; (c) land
  it and skip on a denied describe.
- **taken:** (b). (c) is a failhide. (a) leaves part of #664 open with no wait inside this repo's
  reach, against S2. (b) surfaces the gap once per adopter, with the fix in the message.
- **rework:** clean — one job.
- **confidence 55%, low because:** a red ci on every rds adopter until the grant lands is real
  friction, and the wisher may prefer (a).
- **where:** `persist-with-rds/best-practice/provision/docker/testdb/check-engine-skew.sh`, run by
  the emitted `check-engine-skew.integration.test.ts` `[case4]`, which reads the livedb through
  aws. so the adopter's extant `test-integration` job carries it — no new workflow job, and a
  denied describe exits 1 with `rds:DescribeDBClusters` named, as (b) asks.
- **verdict:** —
