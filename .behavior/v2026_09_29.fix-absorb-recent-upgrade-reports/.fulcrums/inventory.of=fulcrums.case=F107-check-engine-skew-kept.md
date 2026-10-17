# F107 — #664 item 5: `check-engine-skew.sh` stays in persist-with-rds

- **fork:** with the after-upgrade ops gone to the cutover owner (F105), (a) keep the skew check
  and its `.test.yml` job; (b) drop it as a second owner of the cutover.
- **taken:** (a). the check guards the repo's OWN testdb pin against the livedb it tests for: a
  testdb ahead of its livedb lets a test pass on sql the cluster rejects. the pin is declared in
  this repo, and its correctness is this repo's concern. the check only reads the cluster version;
  it performs no step of the cutover. so it is a consumer validation of a dependency, not copium.
- **why it is not certain:** the check reads the live cluster (`rds:DescribeDBClusters`), and the
  grant it needs lives in each adopter's IAM (F38). if the infrastructure repo published the
  cluster's major in a place each service could read, the check could read that instead.
- **rework:** clean — one shell file, one job, one test case group.
- **confidence:** 75%.
- **where:** `provision/docker/testdb/check-engine-skew.sh`, the `.test.yml` skew job.
- **verdict:** —
