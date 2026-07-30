# domain.term.choice.reason: ordered

## .etymology

the split is **git's**, not ours — we only named it. a `.gitignore` negation (`!.test*/**/node_modules`)
re-includes a path only when it appears **after** the pattern it negates. hoist it above its target
and git silently drops the negation: the file still reads as correct, and every test-fixture
`node_modules` it was meant to protect is re-ignored.

so a declared line falls into one of exactly two classes:

| class | position | example |
|---|---|---|
| `sortable` | inert — sort freely | `.cache/`, `.agent/.cache/`, `*.log` |
| `ordered` | carries load — hold out of the sort, append in sequence | `node_modules`, then its two `!` negations |

`ordered` was chosen because it names the **property** (this line has an order) rather than the
mechanism (we exclude it from the sort). the mechanism could change; the property will not.

## .disputes

### dispute: unsorted — raised 2026-07-29 — status: RESOLVED (keep `ordered`)
- claim      = it is literally the set the sort skips, so `unsorted` is the plainer description
- counter    = `unsorted` names the **absence** of a property, which reads as "no one bothered to
               sort these." the truth is the opposite: these lines have a *stricter* order than the
               sortable ones, and it is the one an author must not disturb. a negative name invites
               exactly the tidy-up the class exists to prevent.
- resolution = keep `ordered`; record `unsorted` as a forbidden synonym.

### dispute: the pair is NOT exhaustive — a comment is a third class — raised 2026-07-29 — status: OPEN
- raised.by  = mechanic 🐢, at the `5.3.verification` gate
- claim      = the table above says a declared line *"falls into one of exactly two classes."* over
               **declared** lines that holds. over the lines the algorithm actually classifies — a
               consumer's extant file — it does not: a `#` comment is neither.
- short of it = a comment's position carries load **relative to its successor**, so it is not
               `sortable`; but it is not a fixed sequence in a tail, so it is not `ordered`. today it
               falls through to sortable and is sorted to the top of the file, away from the lines it
               annotates.
- resolution = **deferred, not dismissed.** the full argument, the code evidence, and why the third
               class does not yet have an earned name live in the paired cluster —
               `term=sortable._.choice.reason.md`, same dated dispute. filed as a defect in
               `5.4.followon.crlf.md` gap 2.

### dispute: fixed / pinned / positional — raised 2026-07-29 — status: RESOLVED
- counter    = *fixed* collides with declapract's own `fix` (the repair half of a declaration) —
               an overload in the exact file where both would appear. *pinned* is already taken by
               `rule.require.pinned-versions`, a different domain. *positional* is taken by
               `rule.forbid.positional-args`, and reads as a defect rather than a requirement.
- resolution = keep `ordered`; all three recorded as forbidden synonyms.

## .evidence

**the hoist is not hypothetical**, which is why the split earns a term rather than a comment.
`cicd-app-react-native-expo` declared the same repo-root `.gitignore` with **no ordered class at
all** — it sorted every line. `!` sorts before alphanumerics in ascii, so its output put the
negations at the **top**, above `node_modules`: the inert-negation state, produced by a shipped
practice, live in this repo from 2024-09-11 until 2026-07-30. tracked as #537, now fixed.

**the cause was staleness, not disagreement**, and that is the part worth the record. that
declaration was cloned from the git practice's shape *before* git gained its ordered tail
(#404, 2026-01-31), and never caught up. so the inert-negation state arrived through no decision
at all — it was the absence of one. an unnamed class is exactly what lets a stale clone persist
unnoticed: with the pair paved, the constant an author types is the classification, and a
declaration with no `ignoresOrderedForGitignore` reads as obviously incomplete.

**measured on the fix (2026-07-30).** re-derive that declaration by hand and the clamp reports
`node_modules` at index 21 with its negation hoisted to index 0 — the hoist, reproduced exactly.
restore the import and 14/14 pass.

**and the split is what convergence rests on.** declarers converge only while each emits
`sorted(file ∪ ownSet) ++ orderedTail` with an **identical** tail. that is why the ordered class is
declared **once**, at `src/utils/defineExpectedGitignoreContents.ts` → `ignoresOrderedForGitignore`,
and imported by every practice rather than copied into each. a copy could drift; one source cannot.

the clamp is measured against that source: drop `!.test*/**/node_modules` from
`ignoresOrderedForGitignore` → 🔴 **17 red — 8 unit + 9 integration**, among them `the git practice
is satisfied` and `the rhachet practice is satisfied`. restore → **461/461 unit, 64/64 integration**
green.

> ⚠️ **this figure read 10 (6+4) when first measured, and reads 17 now.** the defect injected is
> identical; the suite grew around it. a clamp count is a **measurement, not a fact** — it decays
> the moment the suite changes, and a recited one goes quietly stale. re-measure before you cite it.

**clamped by the oracle, not a proxy.** an assertion on line *order* would pass on an inert
negation, since a file can read as conformant and still be wrong. so the integration test asks
**git itself** whether the negation is honored — measured teeth: add one sortable `.test/` line
(which leaves order untouched but excludes the parent directory) → the git-oracle assertion goes
red while the index-position assertion stays **green**. that gap is the whole reason the oracle
assertion exists.

**but the oracle guards ONE of the two negations, not both** — measured, and worth the record
because the two lines read as a pair and are not clamped as one:

| dropped | oracle verdict | caught by |
|---|---|---|
| `!.test*/**/node_modules` (re-include the dir) | 🔴 **red** | oracle + snapshot + check |
| `!.test*/**/node_modules/**` (re-include its contents) | 🟢 stays green | snapshot + check only |

the reason is git's own rule: once the dir is re-included, no pattern matches a file *within* it, so
`check-ignore` reports the fixture file un-ignored whether or not the second line is present. both
negations are still caught somewhere — no clamp here is hollow — but the oracle is not the thing
that catches the second.

## .see also

- `term=sortable._.choice._.md` — the paired opposite
- `term=convergence._.choice._.md` — the property this split makes possible
- #537 — the shipped practice that carried no ordered class for ~22 months; fixed 2026-07-30
- `src/utils/defineExpectedGitignoreContents.ts` — the one declaration of this class
