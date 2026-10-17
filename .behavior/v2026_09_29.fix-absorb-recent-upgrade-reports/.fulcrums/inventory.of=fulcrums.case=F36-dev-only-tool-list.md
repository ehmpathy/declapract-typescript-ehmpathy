# F36 — #657: drop only a declared dev-only tool from `dependencies`

- **fork:** (a) drop any key that sits in both sections; (b) drop only keys from a declared list
  (test-fns, jest, @jest/globals, tsx, esbuild-register).
- **taken:** (b). a key in both sections can be a genuine runtime dep that also sits in devDeps by
  mistake; to drop the `dependencies` copy would break the runtime.
- **rework:** clean — the list is one constant.
- **confidence 75%, low because:** the list may miss a tool an adopter hits next.
- **where:** `tests-any/bad-practices/dev-tool-in-dependencies/`.
- **verdict:** —
