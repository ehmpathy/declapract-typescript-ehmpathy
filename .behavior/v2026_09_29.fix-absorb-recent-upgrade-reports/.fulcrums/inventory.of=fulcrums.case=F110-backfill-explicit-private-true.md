# F110 — backfill `"private": true` wherever package.json `private` is not an explicit boolean

- **fork:** the value the backfill writes where `private` is absent or not a boolean — (a) `true`,
  fail closed; (b) `false` once, to keep today's public repos public; (c) `false` always.
- **taken:** (a). asked, the wisher chose `"private": true`: the key is always explicit, in sync
  with the provisioned visibility (S24). an explicit `true` or `false` is never touched.
- **shape:** a provision-github bad-practice, `implicit-package-privacy`. its check detects an absent
  or non-boolean `private`; its fix sets `true` in place, or inserts it before `version` (else after
  the last of name/author/description, else first) — the slot package-json-order wants, so the two
  practices converge rather than reorder each other.
- **the cost, loud and in the safe direction:**
  - every `npm-package` adopter includes provision-github. a published package that omits the key
    gains `"private": true` on its next apply, so its next `npm publish` refuses, and its repo goes
    private on its next provision apply. the owner declares `"private": false` to publish
  - 🔴 **this repo is one of them.** `declapract-typescript-ehmpathy` is `useCase: npm-package`, publishes
    to npm, and its `package.json` has no `private` key. its own next apply backfills `true`. whether
    it declares `"private": false` is the wisher's call, never a practice's (`rule.forbid.fail-open-publicity`)
- **rework:** clean — one bad-practice dir; delete it to revert.
- **confidence 90%** — the value is ruled by the wisher; the insert slot is a best guess that
  follows package-json-order (the directive said "after version"; package-json-order wants
  `private` before `version`).
- **where:** `src/practices/provision-github/bad-practices/implicit-package-privacy/`;
  `rule.forbid.fail-open-publicity`.
- **verdict:** (a), ruled by the wisher. the insert slot and this repo's own opt-in await review.
