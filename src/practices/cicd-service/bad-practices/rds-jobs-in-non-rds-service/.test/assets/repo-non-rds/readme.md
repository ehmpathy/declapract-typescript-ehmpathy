# repo-non-rds

a fixture root for the rds-jobs-in-non-rds-service unit test.

.what = a non-rds consumer — no `provision/schema` dir, no `provision/aws/resources.ts`
        file on disk, so `shipsAnyRdsCallee` returns false.
.why  = the "detects" + "already gone" check cases point their
        `getProjectRootDirectory` here, so the file-on-disk rds signal is genuinely
        absent and the strip is allowed to fire (or the tail is already gone).
