# domain.term: sortable

term.chosen   = sortable
term.kind     = adj
term.synonyms.forbidden:
- loose
- free
- plain
- normal

## .what

of a declared line: one whose **position is inert**, so it may be sorted freely among its peers.

the paired opposite is `ordered` — a line whose position carries load. every declared line is
exactly one of the two.

a practice's sortable set is the part a repo's own custom lines are unioned into before the sort,
which is what makes the fix a **findsert**: a line already present stays present once, and a repo's
own ignores survive.

## .refs

- `src/practices/git/best-practice/.gitignore.declapract.ts` → `ignoresSortable` (17 lines)
- `src/practices/rhachet/best-practice/.gitignore.declapract.ts` → `ignoresSortable` (1 line —
  `.agent/.cache/`, the dir rhachet itself writes)
- `src/practices/{git,rhachet}/best-practice/.gitignore.declapract.test.ts` → `findsert`
- `src/practices/git/.declapract.integration.test.ts` → `a repo's own custom ignores survive`

## .reason

see the ref-level cluster beside this choice:
- `term=sortable._.choice.reason.md` — etymology, rejected synonyms, why the class is the named one
