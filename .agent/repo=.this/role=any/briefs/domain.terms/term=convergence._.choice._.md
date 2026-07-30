# domain.term: convergence

term.chosen   = convergence
term.kind     = noun
term.synonyms.forbidden:
- agreement
- stability
- settlement
- idempotency

## .what

the property that two or more practices which declare the **same file** emit a byte-identical
result, in either application order — so `declapract fix` reaches a fixed point instead of a
rewrite on every run.

its opposite is `oscillation`: each practice rewrites the file into a shape the other rejects.

## .refs

- `src/practices/git/best-practice/.gitignore.declapract.ts` — declarer 1
- `src/practices/rhachet/best-practice/.gitignore.declapract.ts` — declarer 2
- `src/practices/rhachet/best-practice/.gitignore.declapract.test.ts` → `convergence with the git
  practice` — the unit clamp
- `src/practices/git/.declapract.integration.test.ts` → `[case1]` — the pipeline clamp
- `src/practices/{git,rhachet}/best-practice/.declapract.readme.md` — stated from both sides

## .reason

see the ref-level cluster beside this choice:
- `term=convergence._.choice.reason.md` — etymology, rejected synonyms, the run that confirmed it
