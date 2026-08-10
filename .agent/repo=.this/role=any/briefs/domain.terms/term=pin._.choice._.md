# domain.term: pin

term.chosen   = pin
term.kind     = noun
term.synonyms.forbidden:
- hash
- digest
- lock
- hardcode

## .what

an immutable ref to a third-party dependency, stated as the exact commit it resolves to rather than
as a mutable name that points at it.

for a github action the pin is a full-length commit SHA plus the tag it was resolved from:
`uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4`.

the word is also the verb for the act (`to pin a ref`). that is one concept in two parts of speech,
not an overload — see the `.reason`.

## .refs

- `rule.require.pinned-versions` (mechanic) — the org rule this term is inherited from
- `src/actionPins.declapract.integration.test.ts` — the clamp that holds the pins to their shape; the word
  composes the filename and the `describe('action pins')` block
- `src/practices/cicd-*/best-practice/.github/workflows/**` — the 85 ref sites the pins land in
- `.github/workflows/**` — this repo's own 47
- `.behavior/v2026_08_06.fix-workflow-sha-pins/1.vision.yield.md` — where the synonyms were judged

⚠️ **the term was paved BEFORE it named an identifier, and now names one.** it was authored for the
synonym judgment alone, as an exception to `rule.require.domain-term-itemization`; the same round
then produced `actionPins`, so the exception no longer carries it. read the `.reason` for what that
sequence is worth as precedent — it is not a licence to pave a noun on the expectation that code
will follow.

## .reason

see the ref-level cluster beside this choice:
- `term=pin._.choice.reason.md` — etymology, rejected synonyms, the bar it clears by exception
