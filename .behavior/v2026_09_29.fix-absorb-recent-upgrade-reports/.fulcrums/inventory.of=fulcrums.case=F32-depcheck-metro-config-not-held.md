# F32 — #609 lands; it is not part of the held playwright work

- **fork:** hold #609 with the playwright set (S3), since its `metro-config` require came from a
  hand-copied playwright setup; or land its depcheck half now.
- **taken:** land the depcheck half: lint's `.depcheckrc.yml` contents fn adds `metro-config` to
  `ignores` when `tests-expo` is in play (a union, so scope-safe). app-protools-native holds the
  require today, so its lint is red on every upgrade until this lands; the ignore narrows no one. the
  metro template half rides with #604 and is held.
- **rework:** clean — one conditional line.
- **confidence 70%, low because:** the wisher may count #609 as part of "the playwright part".
- **where:** `lint/best-practice/.depcheckrc.yml.declapract.ts`.
- **verdict:** —
