# F12 — #622: `build:ifstale` owned by tests-any, stamp-based

- **fork:** a stamp file written by `build:ifstale` vs by `build:complete`; home tests-any vs
  typescript-node.
- **taken:** tests-any owns `build:ifstale`, which writes `dist/.build.stamp` only after a green
  build and skips when no src/config file is newer; `test:acceptance:locally` calls it, ci keeps the
  full build. `build:complete` is repo-owned, so a stamp there would not reach every adopter.
- **rework:** clean — one npm command.
- **confidence 65%, low because:** the expo build path has no `dist`; tests-any serves it only if
  the stamp path is generic enough — verified at execution.
- **where:** `tests-any/best-practice/package.json:13`; order list in `package-json-order`.
- **verdict:** —
