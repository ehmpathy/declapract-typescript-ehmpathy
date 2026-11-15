# F15: does the census owe an `.acceptance.test.ts`?

## .the fork
- add a `*.acceptance.test.ts` for `rhx github.main-review.census`
- keep its whole journey in the play test, which drives the real entrypoint as a blackbox

## .taken
the first. `src/github.main-review.census.declapract.acceptance.test.ts` holds every journey that
needs no answer from github:

- `--help`: exit 0, the one flag, its default, the exit codes, snapped
- bad input: an unknown arg and an empty `--owners`, exit 2, each stderr snapped
- the real `gh` with no credentials: exit 1, gh's cause (masked in the snap), the login fix, no
  verdict (F14)

the verdict paths need canned github answers, so they stay in the play test, whose header carries
the `.mock` / `.why` / `.real` note `rule.forbid.integration.mocks` asks for.

- **why the src root.** compile copies `src/practices/` into the shipped declarations; a suite
  there ships and runs from a tree with no `.agent/`. `src/repoSkills.declapract.acceptance.test.ts`
  sits at the src root for the same reason, and it is the precedent for repo-skill acceptance
- **the first guess, a play test alone, was wrong.** it held that the acceptance lane proves only
  the compiled declarations; `repoSkills` refutes that

## .rework
clean. one test file.

## .confidence
92%. repo precedent settles it.

## .verdict
settled by repo precedent (peer review r010, round i003).
