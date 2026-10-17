# F52 — #677: held with the playwright work (S3)

- **fork:** (a) hold #677 with #603/#604/#617 until app-protools-native ships; (b) land a
  standalone expo build-and-cache job now, without the play shards.
- **taken:** (a). the issue's value is the sharded test-play job in the playwright container, which
  needs the held practice and its `@playwright/test` floor. a build-only job half-ships it and
  duplicates the build `test-types` already runs (`.test.yml:67`).
- **rework:** clean — the job lands in an expo-owned workflow either way.
- **confidence 80%, low because:** the wisher may read S3 as "playwright files only" and want the
  build cache now.
- **where:** the D2 table in `1.vision.experience.case=_.md`.
- **verdict:** —
