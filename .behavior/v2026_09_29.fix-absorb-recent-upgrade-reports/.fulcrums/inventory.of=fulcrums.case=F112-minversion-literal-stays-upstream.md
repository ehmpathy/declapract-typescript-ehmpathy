# F112 — the raw minVersion literal on an absent dep is fixed in declapract, not coped with here

- **fork:** (a) give provision-github's `package.json` declaration a custom fix that expands
  `@declapract{check.minVersion(...)}` for an absent key; (b) leave the plain `CONTAINS` declaration
  and reseed the defect to ehmpathy/declapract.
- **taken:** (b). the leak sits in declapract's `fixContainsJSONByReplacingAndAddingKeyValues`: its
  absent-key branch returns the declared value verbatim, while the present-key branch and the
  absent-file path both expand the expression. 36 practices declare `package.json` as a plain
  `CONTAINS`, so all of them share the leak; a fix in one practice would cope with a defect it does
  not own (`rule.forbid.copium`), and 35 others would still leak.
- **evidence:** declapract 0.13.26 dist, line 85-90; `ehmpathy/declapract` `origin/main` still holds
  the same branch at line 108 of the `.ts` source. the extant reseed
  `.dream/v2026_10_14.reseed.declapract-contains-json-adds-raw-minversion-markers.md` names the
  cause and the fix shape; provision-github is added there as a second witness.
- **cost of the deferral:** a repo without the deps gets an uninstallable `package.json` after one
  apply; a second apply converges it.
- **rework:** clean — no code here. the fix ships in declapract; a floor bump picks it up.
- **confidence 90%** — the read of the branch is direct. what is not measured: whether declapract's
  owner prefers the fix in the merge (absent-key expand) or in the declaration parse (expand once).
- **where:** `node_modules/declapract/dist/.../fixMethods/fixContainsJSONByReplacingAndAddingKeyValues.js`.
- **verdict:** —
