# domain.term.choice.reason: declaration

## .etymology

`declaration` comes from declapract's own name and its own contract: a practice **declares** what a
file should hold, and a `*.declapract.ts` module is where that declaration lives. the word was
already in the repo's prose — this round only made it canonical, and paired it with `template`.

the pair is named for one reason: **the two are indistinguishable by location.** both sit under
`best-practice/`. only the filename suffix separates them, and the difference in what they MEAN is
total:

| | `template` | `declaration` |
|---|---|---|
| e.g. | `best-practice/tsconfig.json` | `best-practice/.gitignore.declapract.ts` |
| copied to a consumer? | **yes** | **never** |
| runs where? | it does not run | **in this repo** |
| its imports are looked up | in the consumer's tree | **here** |
| may import `src/utils/`? | no | **yes** |

## .disputes

### dispute: plugin — raised 2026-07-29 — status: RESOLVED (keep `declaration`)
- claim      = `check` + `fix` bound by filename is precisely a plugin contract, and `plugin` is the
               word a reader from any other tool would reach for. the repo's own prose already says
               "declapract's plugin contract".
- counter    = `plugin` names the **mechanism** (how the module is loaded and dispatched);
               `declaration` names **what it is for** (a statement of what a file should hold). the
               mechanism could change — declapract could load these by manifest tomorrow — and the
               purpose would not. name the motive, not the mechanism.
- resolution = keep `declaration`. `plugin` stays usable in a comment that describes the loader,
               which is a mechanism claim; it is forbidden as the name of the module itself.

### dispute: rule / config — raised 2026-07-29 — status: RESOLVED
- counter    = both are overloaded past use in this repo. `rule` is already the name of a brief
               (`rule.forbid.*`, `rule.require.*`) in `.agent/`, and a reader who meets "the rule
               for `.gitignore`" cannot tell which sense is meant. `config` names a whole practice
               (`src/practices/config/`).
- resolution = keep `declaration`; both recorded as forbidden synonyms.

## .evidence

**this term exists because its absence caused a measured defect, not because it reads well.**

this round i recorded, as fact, that a shared constant *"would move code out of `best-practice/`,
whose files are templates, not a module tree."* that sentence conflates the pair: it reasons about a
**declaration** as though it were a **template**. on that basis i deferred an extraction, and the
wrong claim propagated into **five durable artifacts** plus a github issue before a peer reviewer
disproved it.

what disproves it is one `grep`:

| declaration | imports |
|---|---|
| `src/practices/typescript-node/best-practice/package.json.declapract.ts:3` | `../../../utils/readFile` |
| `src/practices/tests-node/best-practice/jest.unit.env.ts.declapract.ts:6` | `../../../utils/readFile` |
| `src/practices/config/bad-practices/…/prod.json.declapract.ts:4` | `../../../../../utils/readFile` |
| `src/practices/config/bad-practices/…/prep.json.declapract.ts:4` | `../../../../../utils/readFile` |

**four pre-extant importers, two of them at the identical depth, and both of those live INSIDE
`best-practice/`** — the exact directory my claim said forbade it. not one of them creates a
spurious target-file requirement in a consumer; the practices ship as they always have.

### the pair's first PAYOFF — 2026-07-29, `5.3.verification`

the evidence above is the pair's origin: a conflation that **cost** us. worth a record of the
inverse too, since a term earns its keep by what it prevents, and that is harder to notice:

a caution about the ordered tail was owed to whoever might "tidy" it. i had recorded the gap as
**blocked** — the natural home is a `#` comment in the emitted `.gitignore`, and comments get sorted
to the top of the file, so the caution would land far from what it describes.

the human asked why `src/practices/git/best-practice/.declapract.readme.md` could not carry it. the
pair answers in one step: **a readme beside a declaration is declaration-side.** it is not emitted,
not parsed, not sorted — so the sort defect that blocks the comment does not touch it. confirmed by
the useful test in `term=template`: *does a consumer end up with this file's contents?* no — all 116
`.declapract.readme.md` files sit under `src/practices/` or `dist/practices/`, and this repo, which
consumes its own practices, has none at its root.

so the gap had **two audiences**, and only one was blocked:

| audience | reached via | blocked by the sort? |
|---|---|---|
| a maintainer who edits the declaration | the readme — **declaration**-side | ❌ no → fixed |
| a consumer who opens their emitted file | the `.gitignore` — **template**-side output | ✅ yes → still open |

without the pair, "the tail needs a caution and comments get sorted" reads as one blocked problem.
with it, the surfaces separate by whether a consumer receives them, and half shipped immediately.

**the symmetry worth a note:** the same distinction that once closed a real option by conflation
(the extraction, deferred on a false claim) here opened one by separation. a term that only ever
explains past mistakes is a post-mortem; one that changes the next decision is vocabulary.

**the cost of the conflation, stated plainly:** a claim that closed a design option, asserted five
times, never once measured. the pair is paved so the next author meets the distinction at the point
of the edit rather than derives it from a review round.

## .see also

- `term=template._.choice._.md` — the paired opposite
- `declapract-check-semantics.md` — the inverted throw/return contract a declaration obeys
- `rule.require.declapract-integration-tests` — why a declaration with logic owes a pipeline test
