# domain.term: ordered

term.chosen   = ordered
term.kind     = adj
term.synonyms.forbidden:
- fixed
- pinned
- positional
- unsorted

## .what

of a declared line: one whose **position is load-bearing**, so it is held out of the sort and
appended in its declared sequence.

the paired opposite is `sortable` — a line whose position is inert, so it may be sorted freely.
every declared line is exactly one of the two, and the split is what makes `convergence` between
two declarers possible.

## .refs

- `src/utils/defineExpectedGitignoreContents.ts` → `ignoresOrderedForGitignore` — the one
  declaration of the class; both practices import it rather than declare their own
- `src/practices/{git,rhachet}/best-practice/.gitignore.declapract.ts` — each declares only
  `ignoresSortable`, the part the two legitimately differ on
- `src/practices/{git,rhachet}/best-practice/.gitignore.declapract.test.ts` → `the ordered tail`
- `src/practices/git/.declapract.integration.test.ts` → `the node_modules negation is honored by
  git itself`

## .reason

see the ref-level cluster beside this choice:
- `term=ordered._.choice.reason.md` — etymology, rejected synonyms, why the split exists at all
