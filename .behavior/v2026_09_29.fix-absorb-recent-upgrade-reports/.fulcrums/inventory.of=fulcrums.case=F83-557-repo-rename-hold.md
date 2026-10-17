# F83 — #557: the rename is a future todo, out of this round

- **fork:** (a) the fix release ships under the current name and the rename ships as the release
  right after it; (b) one release carries both; (c) the rename waits for a later round.
- **taken:** (c), ruled by the wisher (S15). the fix release ships as
  `declapract-typescript-ehmpathy`; svc-protools and svc-service-providers upgrade on it with no
  `declapract.use.yml` edit.
- **the plan for the later round:** `package.json` name `declapracts-by-ehmpathy`; every in-repo
  reference and fixture; `gh repo rename` (github keeps the redirect); `npm deprecate
  declapract-typescript-ehmpathy` with a pointer; a note to each consumer. the repo rename needs
  repo admin, the deprecate an npm token.
- **rework:** clean — no name moves this round.
- **where:** #557 holds the plan (the dream that once held it is pruned, as the ticket exists).
- **verdict:** ruled (S15) — a future todo; #557 stays open with a hold comment.
