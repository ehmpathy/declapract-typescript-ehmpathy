# F46 — #671: the check covers exactly the specifiers the fix can rewrite

- **fork:** (a) as the issue asks, a check broader than the fix (any specifier, `[^'"]*`); (b) the
  check and the fix share one specifier set (relative and `@src/`); (c) a broad check plus a fix that
  stamps a `// @declapract:review` marker where it cannot rewrite.
- **taken:** (b). a check that flags a file the fix cannot change never converges (B4), and the broad
  form flags a package subpath such as `'some-pkg/domain'`. a clamp fails when one list catches a
  fixture the other misses.
- **rework:** clean — (c) is one more fix branch.
- **confidence 70%, low because:** the reporter asked for (a) on purpose, to catch shapes the fix
  does not yet know.
- **where:** `directory-structure-src/bad-practices/old-import-paths/`.
- **verdict:** —
