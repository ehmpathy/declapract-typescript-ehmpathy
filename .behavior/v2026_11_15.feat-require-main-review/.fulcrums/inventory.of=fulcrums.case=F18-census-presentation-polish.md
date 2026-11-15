# F18: does census presentation polish block this pr?

## .the fork
- reshape the census output now, per peer review r011: nitpicks 2, 3, 4, 5 and 8 (round i003), and
  3 through 8 (round i004)
- ship the current shape, which is snapped and correct, and leave each reshape as a follow-up

## .taken
the second. none ships harm (the reviewer graded each `[nitpick][better]`), and each moves a
snapped contract that the commander has not seen:

| nitpick | ask | why it waits |
|---|---|---|
| i004.3 | close the stdout tree with a `└─` line when the walk halts | the 💥 error on stderr is the close; a stdout close line moves every failure snapshot, and stderr and stdout interleave at a terminal |
| i004.4 | a plain phrase in place of `reviewDecision=(empty)` in the signal cell | the raw field is the evidence the commander can check against github; a gloss would hide it. the help explains each decision |
| i004.5 | a header row on `rows.tsv`, or named fields | caught as a dream already: `dreams/2026_11_15.census-named-row-fields.dream.md` |
| i004.6 | one verb per stage: `listed` vs `read` | the two counts differ by the skipped repos, which the `read` line names in place |
| i004.7 | drop the split on a zero count | a fixed shape is easier to scan and to grep than one that varies with the count |
| i004.8 | close the clamp snapshot block with `});` | the snapshot shows the slice the clamp reads, and the clamp stops at the block's last field |
| i005.4 | move `done` out of the owners branch | `done` closes the owners branch as its last child. an owner line always reads `<owner>: N repos listed`, so a bare `done` cannot pass for an owner |
| i005.5 | an `unknown` row names what would decide it | the help names both deciders (an admin token, or a newer pr); the row's signal states the fact, as each other row does |
| 2 | the release-workflow count on its own tally line | the line reads correctly; a new tree shape moves every census stdout snapshot |
| 3 | name each repo that lacks a gate in stdout | 141 names flood the terminal; the table at `.log/github.main-review.census/census.md` is the list, and it rides in the pr body |
| 4 | a `basis` column in the table | `rows.tsv` carries the basis per repo (now pinned by the play test); the pr body table is the commander's read, and its shape is his call |
| 5 | lead `--help` with usage, not the `.what` / `.why` header | `declapract.walk` prints its header block as help the same way (`sed -n '2,37p'`); a usage-first help is a convention for both, not a one-skill reshape |
| 8 | trim the whole-file `resources.ts` snapshots; match file-end shapes | the whole-file pair is what r002 asked for, to prove apply leaves the rest of the file whole |

the cheap, clear asks from the same review are in: the column header (`review gate on main`), the
cap fix names the skill's path, and the no-credentials fix names `gh auth login` / `GH_TOKEN`.

## .rework
clean. each row is a skill edit plus a resnap; no consumer reads the shape.

## .confidence
80%.

## .verdict
best-guessed.
