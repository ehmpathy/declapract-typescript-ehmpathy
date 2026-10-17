# F21 — #652: ship the us-east-1 CA bundle; other regions fail loud

- **fork:** ship the us-east-1 regional bundle, or the ~160KB global bundle.
- **taken:** us-east-1. `asDatabaseClientSsl` parses the region from the endpoint and throws a
  ConstraintError with a hint for any other region; a null endpoint (the testdb) connects plain.
- **rework:** clean — swap the bundle constant.
- **confidence 65%, low because:** the fleet is us-east-1 today by observation, not by declaration.
- **where:** `persist-with-rds/best-practice/src/utils/database/{rdsCaBundleUsEast1,asDatabaseClientSsl}.ts`.
- **verdict:** stands; sql-schema-control's ssl option is a caught dream, not work this round
  (seed S5) — migrations stay plain while clusters run `force_ssl = 0`.
