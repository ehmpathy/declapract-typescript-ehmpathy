# domain.term.choice.reason: sortable

## .etymology

`sortable` is the **named default**, and that is the deliberate choice. nearly every declared line
has no positional requirement — 17 of 20 in the `git` practice, 1 of 1 in `rhachet` — so a domain
could reasonably have left this class unnamed and given a name only to the exception (`ordered`).

it is named anyway, for one reason: **an unnamed default is an invisible decision.** an author who
adds a line to a declaration must decide which class it belongs to, and a class with no name is a
question no one knows to ask. with both named, the constant an author types (`ignoresSortable` vs
`ignoresOrderedForGitignore`) *is* the decision, made at the point of the edit.

the pair is also what makes the shared/owned split legible in code: a practice declares its own
`ignoresSortable` and imports the ordered class, so the file states in its own shape which lines it
owns and which it inherits.

## .disputes

### dispute: leave it unnamed — raised 2026-07-29 — status: RESOLVED (name it)
- claim      = `rule.prefer.wet-over-dry` and minimalism both argue against a term for "the normal
               case". name only the exception.
- counter    = the cost of the unnamed default is measured, not hypothetical. every line added to
               either declaration is a silent classification, and the wrong classification is the
               inert-negation defect — which **reads as correct in the file** and is caught only by
               the git oracle. a named pair makes the classification an explicit, reviewable act.
- resolution = name both. the pair is the unit; neither reads correctly alone.

### dispute: the pair is NOT exhaustive — a comment is a third class — raised 2026-07-29 — status: OPEN
- raised.by  = mechanic 🐢, at the `5.3.verification` gate
- claim      = both this cluster and `term=ordered` assert *"every declared line is exactly one of
               the two."* that is **false over the domain the algorithm actually spans.** a comment
               line is a third class the vocabulary does not name, and the absence of the name is a
               live defect rather than a documentation nit.
- evidence   = `defineExpectedGitignoreContents` classifies with
               `(line) => !!line && !orderedPatterns.has(line)`. a `#` comment is truthy and absent
               from the ordered set, so it falls into **sortable** — and is sorted. in ascii
               `#`(35) < `*`(42) < `.`(46), so it migrates to the top of the file, detached from the
               lines it was written to annotate. filed as gap 2 of `5.4.followon.crlf.md`.
- the gap    = a comment's position **carries load**, so it is not `sortable`. but the load it
               carries is *relative to its successor*, not a fixed sequence in a tail, so it is not
               `ordered` either. it is a genuinely distinct concept: **ordered-with-successor**.
- the deeper cause = the two terms are defined *"of a declared line"*, and over declared lines the
               dichotomy really is total — a practice declares no comments. but the algorithm
               applies the same split to the **consumer's extant lines** (`ignoresFromFileSortable`),
               and over that wider domain it is not. the vocabulary's scope and the code's scope
               have quietly diverged.
- why OPEN   = the third class is real and demonstrated, but its **name is not yet earned**.
               `ordered-with-successor` is descriptive, not discovered — it names the mechanism
               (how it is held) rather than the motive, which `term=ordered._.choice.reason.md`
               rejects on principle. per `rule.require.domain-discovery-for-term-proposals` a term
               may not enter the glossary on a guess. it is deferred to the wish that fixes gap 2 —
               legitimately, since the concept needs discovery rather than a keyboard decision.
- meanwhile  = the two say-level files keep their phrasing, since it is true of *declared* lines. the
               correction that matters — that the split is not total over consumer lines — lives
               here, where the next author who reaches for "there are exactly two classes" will meet it.

### dispute: loose / free / plain / normal — raised 2026-07-29 — status: RESOLVED
- counter    = all four name the class by what it **lacks** (a constraint), which understates it.
               `sortable` names what the class **permits** — and it is the exact permission the fix
               relies on, since the sort is what merges a repo's own lines with the declared set.
               *normal* additionally implies `ordered` is abnormal, when it is merely rarer.
- resolution = keep `sortable`; all four recorded as forbidden synonyms.

## .evidence

**the class is what makes the fix a findsert.** `defineExpectedContents` unions the file's extant
sortable lines with the practice's own, dedupes, and sorts:

```ts
const sortedIgnores = dedupe([...ignoresFromFileSortable, ...ignoresSortable]).sort();
return [...sortedIgnores, ...ignoresOrderedForGitignore, ''].join('\n');
```

so the sortable class carries two guarantees, both clamped with measured teeth:

| guarantee | clamp | teeth |
|---|---|---|
| a repo's own custom ignores survive | `should preserve a repo's own custom ignores` | drop `ignoresFromFileSortable` from the union → custom lines silently deleted |
| a line already present stays present **once** | `no line appears twice` (unit + integration) | drop `dedupe` → the report names `"node_modules"` exactly |

**and the ordered class deliberately bypasses `dedupe`** — it is filtered out before the sort and
appended after, so its safety rests wholly on the `orderedPatterns` filter, never on dedupe. that
asymmetry is the reason the "no duplicate line" clamp had to exist at the **integration** grain too:
that is the only place a *second* declarer appends a tail to a file that already carries one.

## .see also

- `term=ordered._.choice._.md` — the paired opposite
- `term=convergence._.choice._.md` — the property the pair makes possible
- `rule.forbid.nonidempotent-mutations` — where `findsert` is defined
