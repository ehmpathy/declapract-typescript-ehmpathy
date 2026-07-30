# domain.term.choice.reason: oscillation

## .etymology

the word entered as the antonym `convergence` needed: a sequence of applications either settles or
it does not. `term=convergence._.choice._.md` named it **two rounds before this cluster existed**,
and that gap was deliberate — it described a state this repo had inferred but never produced.

## .why it is paved now

it was deferred twice, each time on the same ground: *"it stays a hypothesis on #537."* the prior
round also named the temptation to over-claim — *"a smaller fix is not evidence of the defect."*

that held. what changed is that the pair was **run** on 2026-07-30.

## .disputes

### dispute: churn — raised 2026-07-30 — status: RESOLVED (keep `oscillation`)
- claim      = `churn` is plainer and needs no mathematical sense from the reader.
- counter    = `churn` names the symptom a human notices (a dirty diff every run) and is silent on
               the cause. it also fits states that are not this one — a single declarer with a
               non-deterministic fix churns with no second declarer present. `oscillation` names
               the structure: two or more parties, each rejects the other's output.
- resolution = keep `oscillation`; `churn` recorded as a forbidden synonym. it stays fine in prose
               that describes the symptom to a reader who does not yet need the cause.

### dispute: thrash / flip-flop / instability — raised 2026-07-30 — status: RESOLVED
- counter    = *thrash* is taken hard in computer systems (memory, scheduler) and imports a
               performance sense this lacks. *flip-flop* implies exactly two states; three
               declarers can cycle through more. *instability* is the antonym of `stability`,
               which `term=convergence._.choice.reason.md` already rejected as a synonym of
               convergence — it would inherit that ambiguity from the other side.
- resolution = keep `oscillation`; all three recorded as forbidden synonyms.

## .evidence

**measured 2026-07-30. read the grade, not just the verdict.**

the pre-fix algorithm was restored by hand into expo's declaration — sort every line, no ordered
tail — and the suite re-run:

| observed | grade |
|---|---|
| each declarer's check rejects the other's settled output (9 assertions red) | ✅ measured |
| the two fixes reach different files, in either order | ✅ measured |
| the negation hoists above its target (`node_modules` idx 21, negation idx 0) | ✅ measured |
| the defective declaration is a perfect fixed point **with itself** | ✅ measured |
| a literal repeated `declapract fix` loop, watched | ❌ **not** observed |

the last row is the honest bound. what was measured is the precondition: each declarer rejects the
file the other produced, so a `fix` must follow every `check`. the loop then follows from
declapract's gate semantics (a throw from `check` runs `fix`), not from a watched run.

stronger than the two prior rounds held, weaker than "we saw it loop." both halves belong on the
record — the deferrals were correct because nobody had checked which half they had.

## .the cause was staleness, not disagreement

#537 framed this as two declarations that disagree. `git log` says otherwise: expo's declaration
is `d72788c` **2024-09-11**; git gained its ordered tail in `7902d41` **2026-01-31** (#404). expo
was cloned ~17 months before the tail existed and never caught up.

**that generalizes:** oscillation between declarers needs no disagreement. it needs only that one
of them stop track of a shape the others moved.

## .what forecloses it

one shared algorithm — every declarer routes through
`src/utils/defineExpectedGitignoreContents.ts` and declares only its own `ignoresSortable`. two
copies could drift step-for-step; one source cannot.

the residual hole: no build step stops a new declaration from a re-derivation. the cross-declarer
clamps catch it once the declaration exists and the suite runs; a lint rule or a single-owner
registry would catch it at author time. that guard is unbuilt.

## .see also

- `term=convergence._.choice._.md` — the antonym, and the property that forbids this state
- `term=ordered._.choice.reason.md` — the ordered tail whose absence produced this instance
- #537 — the hypothesis this term named for two rounds; confirmed, fixed, clamped 2026-07-30
- `.behavior/v2026_07_28.fix-gitignore-cache-dirs/5.5.resolution.for-537.md` — the full run
