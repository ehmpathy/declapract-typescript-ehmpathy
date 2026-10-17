# F53 — #678: no new `test:build` job; a clamp proves every pr workflow builds

- **fork:** (a) add a `test-build` job as asked; (b) add a shared `NODE_OPTIONS` repo variable to
  `.test.yml` and `.deploy-sls.yml`; (c) close on a clamp that asserts every pr workflow the
  practices emit runs `npm run build`, with a comment that cites `.test.yml:67`.
- **taken:** (c). the pr pipeline already runs the deploy build (`test-types`, every shard). (a)
  duplicates it and collides with #677's `test-build` name; (b) adds a knob for a drift that only an
  adopter's hand edit creates.
- **rework:** clean — (b) is two `env:` lines if the reporter's drift recurs.
- **confidence 75%, low because:** the reporter may want the heap knob (b) to stop the hand edit.
- **where:** a clamp beside `cicd-common/best-practice/.github/workflows/.test.yml`.
- **verdict:** —
