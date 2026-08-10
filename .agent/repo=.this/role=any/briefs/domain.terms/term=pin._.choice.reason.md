# domain.term.choice.reason: pin

## .etymology

the word was **inherited, not coined**. `rule.require.pinned-versions` (mechanic) already reads
*"always pin dependency versions exactly … eliminates surprise changes if dependencies ignore
semver."* that rule was written for `package.json`, so its vocabulary never reached the surface
where a github action lives — a `uses:` line in yaml.

this round extended the rule to that surface. the term did not need a new word; it needed to be
recognized as **the same concept** already named. so this cluster is a conformance record, not an
invention: a github action is a dependency, and the word for an exact dependency ref is `pin`.

## .why it is paved despite no identifier

⚠️ **this term clears the itemization bar by exception, and the exception should be legible.**
`rule.require.domain-term-itemization` asks for terms that compose a **declared** dobj or dop. `pin`
composes none — there is no `Pin` class and no `getPin`. `grep src/**` returns zero matches.

it is paved for one reason, and it is narrower than it looks: **this round SETTLED a synonym
judgment in a durable artifact.** the vision's "their words vs ours" table judges `pin` canonical
against the words a reader will actually reach for. per
`im_an.obsessive_learner.for.domain.terms.md`, a settled synonym judgment lands in the term file
*that round* — deferral is valid only for a term the round could not finish. this one finished.

the judgment is also **design-independent**, which is what makes it safe to pave from a vision
stone. three fulcrums (F1-F3) in that vision are unratified and could reshape the whole approach.
not one of them touches whether the word is `pin` or `hash`.

this follows the `declarer` precedent — a term paved without an identifier — and inherits its
caution verbatim: **that exception is narrow.** `declarer` was paved because the glossary could not
state its own terms without it. `pin` is paved because a synonym judgment was settled and would
otherwise decay into tribal knowledge. neither is licence to pave every noun in the prose.

### ⚠️ the exception expired in the same round that claimed it — 2026-08-06

the paragraphs above were true when authored, at the vision stone. they stopped being true at
execution: `src/actionPins.declapract.integration.test.ts` landed, and the word now composes a filename and a
`describe('action pins')` block. `grep src/**` no longer returns zero.

so **`pin` clears `rule.require.domain-term-itemization` on the ordinary bar now** — the exception
is history, not a live justification. two consequences worth the record, because they point
opposite ways:

1. **the exception was correct at the time, and would have been correct even had no code followed.**
   the synonym judgment (`hash` / `lock` / `digest` / `hardcode`, all judged forbidden) was settled
   in a durable artifact that round, and per `im_an.obsessive_learner.for.domain.terms.md` a settled
   judgment lands *that round*. the code that later arrived does not retroactively justify it.
2. **and it is NOT precedent that "an identifier will come along."** at the vision stone i did not
   know the clamp would be named `actionPins` — F1 was still open, and a shared-registry shape would
   have produced a different name, or none at all. to read this sequence as *"pave the noun, the
   code will catch up"* is to read a coincidence as a rule. the bar that held is the one stated
   above: a **settled judgment**, design-independent, in a durable artifact.

the honest shape of it: `declarer` remains the cleaner precedent for a term paved without an
identifier, because its exception has not expired and cannot — the glossary still cannot state
`convergence` without it. `pin`'s exception lasted one stone.

## .disputes

### dispute: hash — raised 2026-08-06 — status: RESOLVED (keep `pin`)
- claim      = "hash" is what a developer says out loud, and what the value literally is. the
               vision's own mental-model table records the user words as *"hardcode the hash."*
- counter    = `hash` names the **value**; `pin` names the **relation**. a SHA is a hash whether or
               not anyone depends on it; it becomes a pin only when a ref is fixed to it. the
               distinction carries load here: the tag tail (`# v4`) is part of the pin and is not
               part of the hash, so "hash" cannot name the artifact this repo actually ships.
               `hash` is also taken hard org-wide — `toHashSha256Sync`, cache keys, `md5sum` in the
               workflows themselves.
- resolution = keep `pin`; record `hash` as a forbidden synonym in a contract. it stays correct in
               prose that describes the value ("the SHA is a hash of the commit").

### dispute: lock — raised 2026-08-06 — status: RESOLVED (keep `pin`)
- claim      = the npm world says "lockfile" for exactly this guarantee, so `lock` would connect the
               two surfaces in a reader's head.
- counter    = a lockfile is **generated and machine-refreshed**; a pin here is **authored and
               hand-verified** — that difference is the whole subject of the wish (a SHA must be
               derived from upstream at author time, per wish constraint 1). to borrow `lock` would
               import an expectation of automatic refresh that this design explicitly does not
               provide, and the absence of that refresh is the wish's recorded tradeoff. the word
               would promise the exact property we record that we lack.
- resolution = keep `pin`; record `lock` as a forbidden synonym.

### dispute: the `# <tag>` tail deserves a cluster of its own — raised 2026-08-06 — status: RESOLVED (no cluster; it is part of the pin)
- claim      = the tail is a distinct concept from the sha, it now names identifiers
               (`asActionRefTag`, `isActionRefTailed` in `src/actionPins.declapract.integration.test.ts`), and
               it carries its own rule — *"a prefix of the comment, not the whole of it"*. by the
               ordinary itemization bar it qualifies. deferred twice as `tag tail`, on the ground
               that the word was a coinage rather than a discovery.
- counter    = it splits one concept across two words, which is the sprawl
               `rule.forbid.domain-term-synonyms` guards against, run in reverse. two reasons:
               (1) the **value** is a `tag` — github's word for github's object, and
               `template.domain-term.md` is explicit that vocabulary imported from a dependency
               earns no cluster (the same verdict that left `meta` unpaved).
               (2) the **relation** it records is already what `pin` names. the `hash` dispute
               above states it: *"the tag tail is part of the pin and is not part of the hash."*
               a pin with no tail is a **defective pin**, not a pin with a piece absent — which is
               why `isActionRefTailed` asserts about a ref that is already pinned, rather than
               about a second object beside it.
               and `tail` names the **position** (where it sits on the line), which is a mechanism.
               `term=ordered._.choice.reason.md` rejects mechanism-names on principle. the motive
               is **provenance**, and provenance is already this cluster's `.what`.
- rejected   = *"version comment"* — the one word the external world offers (dependabot's frame).
               it reads false the moment the tag moves: a "version" claim goes stale while the
               provenance claim stays true about the day the sha was derived.
- resolution = **no cluster.** `tail` stays legitimate in prose and in an identifier that describes
               position within a pin — the same latitude the `declaration` cluster grants `plugin`
               for a mechanism claim. the concept lives here, in `pin`, where it belongs.
- ⚠️ .note   = this closes a deferral carried for two rounds. the honest reason the first two
               deferrals were right and a third would not have been: each earlier round lacked a
               real piece — first the discovery, then the code that would name it. this round had
               both, so the question was answerable rather than open.

### dispute: digest / hardcode — raised 2026-08-06 — status: RESOLVED
- counter    = *digest* is oci/container vocabulary (`image@sha256:…`) and would suggest a registry
               concept that is not in play. *hardcode* is pejorative and describes a mechanism, not
               a motive — `term=ordered._.choice.reason.md` rejects mechanism-names on principle
               ("the mechanism could change; the property will not").
- resolution = keep `pin`; both recorded as forbidden synonyms.

### dispute: the verb `pin` overloads the noun `pin` — raised 2026-08-06 — status: RESOLVED (allow)
- claim      = the concern paired with `rule.forbid.domain-term-synonyms` is one word for one
               concept. this word serves as both noun ("the pin") and verb ("to pin").
- counter    = it is **one concept in two parts of speech**, not two concepts in one word — the verb
               is precisely "to create the noun". the overload the rules forbid is `session` used
               for both a lesson and a login: two unrelated concepts. this is the ordinary english
               noun/verb pair, and the repo's own `rule.require.treestruct` already reads verbs and
               nouns as distinct positions rather than as collisions.
- resolution = allow both. `term.kind = noun` is the declared kind; the verb is that noun's act.

## .evidence

**the synonym judgment is not hypothetical — the wrong word was already in the room.** the wish's
ground repo, `ehmpathy/declastruct-github`, shipped the artifact this term names, and github's own
error text reaches for a third form again: *"must be pinned to a full-length commit SHA"* — the verb
of the canonical word, from the vendor. so the vendor, the org rule, and this repo now agree on
`pin`, while the words a developer grabs under pressure (`hash`, `hardcode`) do not.

**what the term earns, concretely.** the vision states an invariant that cannot be said in the
synonyms: *"any given action repo resolves to exactly one SHA across every template."* say that with
`hash` and it reads as a claim about hash values; say it with `pin` and it reads as a claim about
refs, which is what it is.

## .see also

- `rule.require.pinned-versions` (mechanic) — the org rule this conforms to, extended to yaml
- `term=declarer._.choice.reason.md` — the precedent for a term paved without an identifier, and
  the caution that the exception is narrow
- `.behavior/v2026_08_06.fix-workflow-sha-pins/1.vision.yield.md` — where the judgment was settled
