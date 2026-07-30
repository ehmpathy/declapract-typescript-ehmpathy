# rule.prefer.bundle-behavior-yield

## .what

a behavior route's whole yield ships as **one commit** — code, `.behavior/` artifacts, `.agent/`
briefs, and `domain.terms/` clusters together. do not split the docs into a second commit, and do
not pause to ask whether they belong.

## .why

the docs are the evidence for the code change. a glossary cluster explains why a term was chosen;
a brief states the contract the code implements. read beside the diff they justify, they carry
their full weight; read in a separate commit, a reviewer has to go find the change they describe.

the route already treats the yield as one deliverable, so a split fragments one behavior across
commits and buys no gain.

## .how

stage everything the behavior produced. write one commit whose body covers the **code** change —
the briefs and glossary work ride along without separate mention in the message.

## .enforcement

- a behavior's docs split into their own commit, with no reason recorded = **nitpick**
- a pause to ask whether the behavior's own docs belong in its commit = **nitpick**
