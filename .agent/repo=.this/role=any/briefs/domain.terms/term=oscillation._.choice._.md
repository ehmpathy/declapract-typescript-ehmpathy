# domain.term: oscillation

term.chosen   = oscillation
term.kind     = noun
term.synonyms.forbidden:
- churn
- thrash
- flip-flop
- instability

## .what

the failure state in which two or more declarers of one file each rewrite it into a shape the
others reject, so `declapract fix` never reaches a fixed point and the file is rewritten on every
run, forever.

it is the antonym of `convergence`, and the reason that term exists. each declarer may be a
perfect fixed point **with itself** and still oscillate against the others — so a per-declaration
suite cannot detect it.

## .refs

- `src/practices/cicd-app-react-native-expo/best-practice/.gitignore.declapract.test.ts` →
  `convergence with the git practice` — the clamp that reproduces it on demand
- `src/practices/{git,rhachet}/best-practice/.gitignore.declapract.test.ts` — the same clamp from
  the other two declarers
- `src/utils/defineExpectedGitignoreContents.ts` — the one shared algorithm that forecloses it
- `src/practices/git/best-practice/.declapract.readme.md` →
  `a green per-declaration suite is not evidence of convergence`

## .reason

see the ref-level cluster beside this choice:
- `term=oscillation._.choice.reason.md` — etymology, rejected synonyms, and the run that
  confirmed it after two rounds as a hypothesis
