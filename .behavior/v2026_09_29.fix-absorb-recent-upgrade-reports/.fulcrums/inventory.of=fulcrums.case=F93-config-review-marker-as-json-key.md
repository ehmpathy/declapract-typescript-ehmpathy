# F93 — #544: the unmigrated-param-paths marker is a JSON key, `@declapract:review`

## .the fork

- **A:** stamp a top-level `"@declapract:review"` key into each `config/{test,prep,prod}.json` that
  still holds explicit param paths.
- **B:** no stamp; a fixless bad-practice that only reports the file.
- **C:** a `//` comment line, as the code markers do.

## .taken

A. JSON holds no comments, so C cannot parse. B leaves the file flagged manual with no word on what
to do (F78 ruled a marker over a fixless check). the key sits beside the config the reader must
migrate, and the config schema ignores unknown keys, so `getConfig` still loads (proven by
`config-validates-schema` case2).

## .rework

clean. the bad-practice's fix drops the key it stamped; a switch to B deletes one fix fn.

## .confidence

70% — a repo whose config schema is `.strict()` would reject the extra key at load; none of the
reporters run strict config schemas, and the practice's own schema is not strict.
