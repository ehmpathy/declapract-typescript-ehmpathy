# domain.term: declaration

term.chosen   = declaration
term.kind     = noun
term.synonyms.forbidden:
- template
- plugin
- rule
- config

## .what

a `*.declapract.ts` file: a module **executed in THIS repo**, bound to the file it governs by its
own filename, which exports `check` and `fix`.

its imports are looked up **here**, so it may import from `src/utils/` like any other module in this
repo. it is never copied to a consumer.

the paired opposite is `template` — a file in `best-practice/` that IS copied. the two sit side by
side in the same directory, and the whole reason this pair is named is that they are easy to
conflate and the conflation has a measured cost.

## .refs

- `src/practices/git/best-practice/.gitignore.declapract.ts` — declares the repo-root `.gitignore`
- `src/practices/rhachet/best-practice/.gitignore.declapract.ts` — declares the same file
- `src/practices/typescript-node/best-practice/package.json.declapract.ts:3` — a declaration that
  imports `src/utils/readFile`, at the same depth, from inside `best-practice/`
- `src/practices/tests-node/best-practice/jest.unit.env.ts.declapract.ts:6` — likewise
- `.agent/repo=.this/role=any/briefs/declapract-check-semantics.md` — the inverted throw/return
  contract a declaration obeys

## .reason

see the ref-level cluster beside this choice:
- `term=declaration._.choice.reason.md` — etymology, rejected synonyms, and the measured defect the
  conflation with `template` caused
