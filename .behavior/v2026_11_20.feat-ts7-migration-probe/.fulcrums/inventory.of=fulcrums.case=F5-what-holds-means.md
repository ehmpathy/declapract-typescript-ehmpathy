# F5 · "holds" = every break has a shipped fix valid on 5.4.5 too, ci green, wall not slower

- fork: the wish says "if it holds" with no bar. candidates: any speedup; a speedup above some ratio; zero breaks; every break fixable by the practice.
- taken: holds ⟺ (a) every break in the list has a fix the practice ships, (b) each fix also compiles under 5.4.5, so a half-upgraded adopter stays green, (c) this repo's ci is green on 7.0.2, (d) median wall time is not slower than 5.4.5.
- rework: clean. the bar decides one pr shape (case=1 vs case=2); the measurements are the same either way.
- confidence 80%, why low: the wisher may want a minimum speedup ratio, or may count "an adopter must hand-edit" as a fail.
- where: `1.vision.yield.md` · open questions.
- verdict: —

