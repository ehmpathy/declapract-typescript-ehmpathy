---
name: rule.forbid.access-permission-not-place
description: forbid the "access tier" synonym, the "deploy/act TO or against a tier" place-model, and the implicit access mention that ambiguates whether access is a permission or a place
type: rule
---

# rule.forbid.access-permission-not-place

## .what

`access` (`test | prep | prod`) is a **permission you act WITH**, never a place you act ON
(`define.access`). three shapes drag it back to the place model, and all three are forbidden — in a
contract, a comment, a description, a doc, a log line, anywhere prose can carry the concept:

1. **the `access tier` synonym.** the canonical word is `access`. "tier" re-imports the place model.
2. **the "deploy/act TO or against a tier" verb.** you deploy **with** an access, run **with** an
   access. you do not deploy **to** it, **into** it, or **against** it.
3. **the implicit access mention.** a passage that discusses access but never states which sense it
   means leaves the reader to guess permission-vs-place. name it plainly.

## .why

- **one word, one concept.** `access` and `access tier` name one concept with two words that
  disagree on what it IS — a permission vs a place. that is synonym drift, and it is the exact
  ambiguity `define.access` exists to close (`rule.forbid.domain-term-synonyms`).
- **the words name the hazard.** *"deploy with prod access"* says *"you hold the prod key"*.
  *"deploy to prod"* says *"you pay a place a visit"* — and understates that the identical command
  with a different access overwrites live customer data. the wrong model downgrades a
  fire-the-nukes permission into a change of scenery.
- **the place model re-splits the axis.** once access reads as a place, an author reaches for a
  second word for the place's name — which is the `stage`/`access` divergence this whole line of work
  exists to delete (`rule.forbid.stage-term`). the permission model leaves no slot for a second axis.

## .the forbidden shapes

| 👎 forbidden | 👍 canonical |
|---|---|
| `access tier` | `access` |
| "the access tier to deploy to" | "the access to deploy with" |
| "which access tier do you want to deploy to?" | "which access do you want to deploy with?" |
| "deploy to prep", "deploy into prod" | "deploy with prep access", "deploy with prod access" |
| "run the suite against prep" | "run the suite with prep access" |
| "the tier of resources this process touches" | "the resources this process may act with/on" |
| a bare "for prep" with no permission-vs-place sense | "with prep access" |

## .the one allowed "tier"

`test | prep | prod` is a genuine ordered set, so a sentence about the **set itself** may say "tier"
— e.g. *"prod is the highest tier"*. what is forbidden is `access tier` as a **synonym for the term
`access`**, and the "deploy to a tier" verb. the tell: if you can swap the word for `access` and the
sentence still reads, it was the synonym — cut "tier".

## .the test

for any sentence that carries the concept, ask:

- "does it say **access**, not **access tier**?" — synonym check
- "does it deploy/run **WITH** the access, not **TO/against** it?" — verb check
- "would a reader know this means a **permission**, not a **place**?" — implicit check

any "no" = a violation.

## .enforcement

- `access tier` used as a synonym for `access`, in any contract, comment, description, or doc =
  **blocker**
- a "deploy/run TO, INTO, or AGAINST a tier/prep/prod" verb where "WITH … access" is meant =
  **blocker**
- an implicit access mention that leaves permission-vs-place ambiguous = **nitpick**
- "tier" used for the ordered set itself (`prod is the highest tier`) = **false positive** (allowed)

## .see also

- `define.access` — the concept this rule guards (permission you act WITH, never a place)
- `rule.forbid.stage-term` — the kin forbid: one axis (`access`), the retired second (`stage`)
- `define.sdk-environment-shape` — `access` vs `server`, the two orthogonal axes
- `rule.forbid.domain-term-synonyms` (bhrain/learner) — the general one-word-one-concept rule
