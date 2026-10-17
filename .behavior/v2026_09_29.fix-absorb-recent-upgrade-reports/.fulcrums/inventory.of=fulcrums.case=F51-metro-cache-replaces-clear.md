# F51 — #676/#618: a metro cache keyed on ACCESS + app config replaces `build:web --clear`

- **fork:** (a) #618's `--clear` on every export, the one-flag safe floor; (b) a `metro.config.js`
  findsert whose `cacheStores` dir is keyed on `ACCESS` + the app config hash, so a prep transform
  can never serve a prod bundle and a warm export stays warm.
- **taken:** (b). it closes #618's harm and #676's harm with one shape, and keeps the warm export
  (358s cold → 7.7s warm, per #676). `--clear` would void the cache that (b) exists to keep.
- **rework:** clean — revert to the `--clear` flag in one CONTAINS template line.
- **confidence 70%, low because:** a cache key that misses a transform input (an env var other than
  ACCESS that babel inlines) would leak across builds again; `--clear` cannot miss.
- **where:** `typescript-expo/best-practice/metro.config.js` (new, findsert),
  `typescript-expo/best-practice/package.json`.
- **verdict:** —
