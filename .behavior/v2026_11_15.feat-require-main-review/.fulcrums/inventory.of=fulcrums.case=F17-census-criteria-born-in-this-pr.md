# F17: are census assertion edits within this pr changes to a locked criterion?

## .the fork
- treat each edit to a census expected string as a change to a locked criterion: revert the skill
  output to the first string, or escalate each one
- treat the census tests as criteria born in this pr. they evolve with the contract until the
  commander's review locks them, and each change is recorded

## .taken
the second. no census test exists on `origin/main`; the skill, its play test and its snapshots are
all new in this pr. a criterion locks at merge, not at the first commit of a feature branch. each
change below is a requirement change with a recorded reason, and each made the test stricter:

| change | from → to | the reason |
|---|---|---|
| tally basis split (`21e010c`) | `lacks: 3 (2 with a release workflow)` → `lacks: 3 (2 certain, 1 inferred; 2 with a release workflow)` | a peer review asked the tally to tell a ruleset or protection read from a reviewDecision inference (F4) |
| grammar (round i003) | `archived or fork` → `archived or forked`; `approval(s)` → `approval` / `approvals`; `1 repos` → `1 repo` | peer review i001 r006 blocker.2 asked for correct grammar in human output |
| unknown-owner stub (`6a1b08d`) | gh's real text → `GraphQL: owner not found` | the skill moved to a status read of `users/<owner>`; the stub text no longer mattered |
| read-failure header (round i003) | `cannot verdict 'x'` → `cannot reach a verdict for 'x'` | peer review r006 asked for a plain verb |
| table column (round i003) | `main requires review` → `review gate on main`, separator re-padded | peer review r011 asked that a cell read as a sentence |
| fix lines (rounds i003, i004) | one retry line → a fix per cause: login (401 or no token), rate limit reset, token scope (403), network retry; the cap fix names the skill's path | peer review r011 asked each error to name its own fix |
| help text (verification rounds) | `--owners` gained `, never comma-separated`; the `.note` and guarantee lines now name the basis split, the table replacement and the scratch dir | peer reviews asked the help to name each behavior the census gained |
| arg error labels (round i005) | `run:` / `e.g.:` → `fix:`; the success tree names the table and `rows.tsv`, at paths from the repo root | peer review r011 asked for one label per sense, and for `rows.tsv` to be findable |
| clamp matchers (`21e010c`) | `toContain('…: 1,')` → a regex on the field, after line comments are cut | a formatter may move whitespace or the end comma; the comment cut makes a commented field fail, so the clamp rejects more |

the third row lost fidelity, so it is repaired: cases 5 and 12 now stub gh's real unknown-owner
text (`the owner handle "X" was not recognized as either a GitHub user or an organization`), and
the assertions still hold.

### .the baseline a reviewer may pick instead

peer review r012 (round i005) took the baseline as the commit that first added each test
(`9ee7782` for the play test, `d8969a8` for the clamp), so every later edit reads as a removal.
that baseline makes each review fix a new blocker: the reviewer's own grammar ask, once repaired,
returns as a changed criterion. the lock moment is the commander's call; this pr leaves every
change listed here so he can accept or revert each row.

## .rework
clean. a revert of any row is a string edit plus a resnap.

## .confidence
85%. a feature branch that locks its own criteria at each commit could not take a review fix.

## .verdict
open, for the commander: accept each row at merge, or name the rows to revert.
