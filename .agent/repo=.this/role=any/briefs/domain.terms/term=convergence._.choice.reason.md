# domain.term.choice.reason: convergence

## .etymology

the domain forced the word. before this behavior, every `.declapract.ts` file had **one** declarer,
so the only property worth a name was **idempotency** — one practice's fix that reaches its own
fixed point (`fix(fix(x)) == fix(x)`).

the `rhachet` fold-in made the repo-root `.gitignore` a file with **two** declarers, and that opened
a property idempotency cannot express: each practice may be a perfect fixed point **on its own** and
still undo the other. so the domain needed a word for agreement *between* declarers, distinct from
agreement of a declarer *with itself*.

`convergence` is that word. it comes from the mathematical sense already in play — a sequence of
applications that settles — extended from one function to a set of them.

## .disputes

### dispute: idempotency — raised 2026-07-29 — status: RESOLVED (keep `convergence`)
- raised.by  = mechanic 🐢
- claim      = both terms name "a re-run changes zero", so one word could serve both
- counter    = they are **different properties**, and the repo holds a counter-example that proves
               it — one that was live when this dispute was raised, and is now reproducible on
               demand. a declaration that sorts every line with no ordered tail passes its own
               per-file idempotency test — `fix(fix(x)) == fix(x)` holds for it, and its own check
               passes on its own output. it still cannot converge with `git`. one word for both
               would make that sentence unsayable, and it is the sentence #537 exists for.
- measured   = re-derive `cicd-app-react-native-expo`'s declaration by hand (2026-07-30) and the
               split is exact: **both** per-declaration idempotency assertions stay green while
               **all 9** cross-declarer assertions go red, plus the negation-position check. a
               perfect fixed point that cannot converge — the two properties, separated by run.
- resolution = keep both. **idempotency** = one declarer with itself. **convergence** = two or more
               declarers with each other. recorded `idempotency` as a forbidden synonym *of
               convergence* (not deprecated in its own right).

### dispute: agreement / stability / settlement — raised 2026-07-29 — status: RESOLVED
- claim      = plainer english; a reader needs no math sense
- counter    = each is ambiguous in this exact domain. *agreement* reads as the practices that match
               in **intent**, which is not the claim (they declare different line sets and still
               converge). *stability* is already what idempotency describes. *settlement* has no
               antonym, and the antonym carries load — `oscillation` is the failure this term exists
               to contrast with.
- resolution = keep `convergence`; all three recorded as forbidden synonyms.

## .evidence

**confirmed by run, not by read.** the vision graded this a prerequisite (q15) and stated plainly
that whether declapract even applies both declarations — or dedupes to one — was *"inferred, not
observed"*. move 4 branched on the answer, so it could not ship on a read.

the integration test settled it: apply `git`, then `rhachet` on top, then **both again**. observed —
declapract applies both, neither declaration is dropped, and the file is byte-identical at every
step after the first.

**the condition convergence rests on, and it is narrow:** both declarers must emit
`sorted(file ∪ ownSet) ++ orderedTail` with an **identical** tail. each unions the file's extant
lines before it sorts, so once either has run the file already holds the other's lines — which is
why they converge rather than oscillate. drift one tail and the property is gone.

that narrowness is why the tail is **imported, not copied**: both declarers pull the algorithm and
the ordered tail from `src/utils/defineExpectedGitignoreContents.ts`, and each declares only its own
`ignoresSortable` — the part they legitimately differ on. one source, so the drift that would break
convergence cannot be written.

**the clamp is still measured, and what it guards has shifted.** an earlier shape replicated the
tail verbatim into rhachet, and its injection read "drop one negation from rhachet's copy → 9 tests
red" — a clamp against *drift between the copies*. with one source, that drift is unrepresentable,
so the replacement injection targets the shared constant: drop `!.test*/**/node_modules` from
`ignoresOrderedForGitignore` → 🔴 **17 red — 8 unit + 9 integration**, among them `the git practice
is satisfied` and `the rhachet practice is satisfied`. one defect, both declarers — the property the
extraction was meant to preserve.

> ⚠️ **that figure read 10 (6+4) when first measured, and reads 17 now** — same injected defect, a
> suite that grew around it. a clamp count is a **measurement, not a fact**; re-measure before you
> cite it. (see the same correction in `term=ordered._.choice.reason.md`.)

**an asymmetry inside that clamp, measured because it was not obvious:** the two negations are not
guarded by the same assertions. drop `!.test*/**/node_modules` (the dir re-include) and the oracle
goes red — `the node_modules negation is honored by git itself`, 9 red in the git suite alone. drop
`!.test*/**/node_modules/**` (the contents re-include) and **the oracle stays green**: once the dir
is re-included, no rule matches a file within it, so git reports the fixture file un-ignored either
way. that second negation is caught only by the snapshot and check-satisfaction assertions. neither
clamp is hollow, but the oracle guards one negation, not both.

## .see also

- `rule.require.idempotent-fixes` — the single-declarer property this one is distinct from
- #537 — the `git` ↔ `expo` oscillation this term was coined to name; diagnosed as staleness,
  fixed by the import, and clamped 2026-07-30
- `src/practices/cicd-app-react-native-expo/best-practice/.gitignore.declapract.test.ts` — where
  the counter-example now lives as a reproducible clamp rather than a live defect
- `src/utils/defineExpectedGitignoreContents.ts` — the one source every declarer imports
