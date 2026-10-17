# F101 — 5.3 peer: a template-self-close blocker the reviewer retracted in its own body

## .the fork

`repo-rules-slice-am` (5.3, i001, r001) tallied 1 blocker under
`rule.forbid.template-comment-self-close`, at
`src/practices/config/bad-practices/hand-written-config-type/src/**/*.ts.declapract.ts:14`.

- concede: change the file to satisfy the blocker
- dispute: show that no violation exists

## .taken — dispute

- the report's own body concludes that no comment in the diff holds `*/` mid-prose, that the rule is
  not violated, and that the item should not be reported. the tally of 1 counts the heading, never a
  finding
- `rhx grepsafe --pattern '\*/' --path '<that file>'` returns lines 8, 25, 43, 59 only. each is a
  jsdoc closer alone on its line, which is the correct form
- the rule governs a `best-practice/` template copied verbatim into an adopter. this file is a
  `.declapract.ts` declaration, read by declapract and never emitted, so it is out of the rule's
  scope even if a `*/` sat mid-prose
- line 14 is `import type { FileCheckFunction, FileFixFunction } from 'declapract';`, which holds no
  comment at all

## .rework

clean — if the council rules otherwise, the fix is a one-line comment edit.

## .confidence

97% — the reviewer, the grep, and the rule's scope agree.

## .verdict

open, for the council.
