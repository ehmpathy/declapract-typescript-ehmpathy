# domain.term.choice.reason: foreign

## .etymology

`foreign` = of another owner, from outside. it names the one fact a fix must act on: this block
belongs to someone else, so keep it whole. it pairs with `own`, which the code already uses
(`asSectionsOwn`, `blocksRepoOwn`), so the three block kinds read as one family: own, foreign,
repo-own.

rejected:

- `peer` — already means a peer review in this repo (`.reviews/peer/`, `given.by_peer`); a second
  sense would overload it (`rule.forbid.domain-term-ambiguity`)
- `other` — generic english; names no relation to the fix that reads it

## .disputes

### dispute: peer — raised 2026-11-01 — status: RESOLVED (canonical holds)

- raised.by  = peer review r011 (enroll-impl-arch-defects), 5.1 i004
- claim      = the howto said `peer declarer` where the code says `foreign`; two words, one concept
- counter    = `peer` carries the review sense here
- resolution = `foreign` is canonical; the howto now reads "another declarer", and `peer` is a
  forbidden synonym in this boundary

## .evidence

dimensional walk of a block, by who wrote it × whether the fix at hand declares it:

| wrote it | the fix at hand declares it | kind | the fix |
|----------|-----------------------------|------|---------|
| a declarer, tag = this fix | yes | own | rewrites to `latest` |
| a declarer, tag ≠ this fix | no | foreign | keeps verbatim, in canonical place |
| the repo, untagged | no | repo-own | keeps verbatim, last |
| the repo, tag = a declarer | — | forbidden in practice: read as that declarer's block (see the git readme) |

invariant: a fix changes no byte of a foreign section; `[t2]` of `src/gitattributesDeclarers.declapract.integration.test.ts` proves it end to end.
