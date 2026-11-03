# domain.term: foreign

term.chosen   = foreign
term.kind     = adj
term.boundary = gitattributes.section
term.synonyms.forbidden:
- peer
- other

## .what

of a managed `.gitattributes` section: one whose `# [<declarer>]` tag names a declarer other than
the one whose fix runs. a fix keeps a foreign section verbatim, in canonical place; it rewrites only
its own.

the paired opposites: **own** (the section the fix declares) and **repo-own** (an untagged line the
repo wrote, kept last). every block of the file is exactly one of the three.

## .refs

- `src/utils/defineExpectedGitattributesContents.ts` → `asSectionsForeign`, `sectionsForeign`
- `src/gitattributesDeclarers.declapract.test.ts` → the convergence clamp, which holds only because
  each fix keeps foreign sections whole
- `.agent/repo=.this/role=any/briefs/howto.declare-the-repo-gitattributes.md` → "the declarer tag
  is how declarers agree"

## .reason

- `term=gitattributes.section.foreign._.choice.reason.md`
