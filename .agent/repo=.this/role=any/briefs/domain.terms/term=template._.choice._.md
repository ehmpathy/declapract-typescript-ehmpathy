# domain.term: template

term.chosen   = template
term.kind     = noun
term.synonyms.forbidden:
- declaration
- fixture
- boilerplate
- scaffold

⚠️ `fixture` is forbidden **as a name for a template** and canonical in its own sense — a file that
is an input to a test. see `term=fixture._.choice._.md`.

## .what

a plain file under `best-practice/` that is **copied into a consumer repo** — the literal content a
conformant repo should hold.

it does not run here. its contents mean whatever they mean **in the consumer's tree**, so a relative
import inside a template must be looked up there, not here.

the paired opposite is `declaration` — a `*.declapract.ts` module executed in THIS repo. both sit in
the same directory, and the conflation of the two is a measured defect source (see the reason file
on `declaration`).

## .refs

- `src/practices/git/best-practice/.gitignore` — a template (the literal file a consumer gets)
- `src/practices/lint/best-practice/biome.json` — a template
- `.agent/repo=.this/role=any/briefs/declapract-default-check-equals.md` — a template with no
  paired declaration is checked with `EQUALS` by default
- `.agent/repo=.this/role=any/briefs/howto.add-best-practice.md` — how a template is authored

## .reason

see the ref-level cluster beside this choice:
- `term=template._.choice.reason.md` — etymology, rejected synonyms, and why the pair is named
