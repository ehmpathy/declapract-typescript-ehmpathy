# domain.term: declarer

term.chosen   = declarer
term.kind     = noun
term.synonyms.forbidden:
- owner
- author
- source
- contributor

## .what

a **practice** that declares a given file — one that carries a `declaration` for it.

the distinction from its near-twin: a `declaration` is the `*.declapract.ts` **module**; a
`declarer` is the **practice** that holds one. a single file may have many declarers, and it is
that plurality the word exists to name.

## .refs

- `src/practices/git/best-practice/.declapract.readme.md` — states the shared contract in terms of
  "every declarer", deliberately rather than by a list of named practices
- `term=convergence._.choice._.md` — its `.refs` label two declarers of one file
- `term=convergence._.choice.reason.md` — distinguishes `convergence` from `idempotency` as
  *between declarers* vs *a declarer with itself*
- `term=ordered._.choice.reason.md`, `term=sortable._.choice.reason.md` — both reason about what
  a second declarer appends

## .reason

see the ref-level cluster beside this choice:
- `term=declarer._.choice.reason.md` — etymology, why it is paved despite no identifier, rejected
  synonyms
