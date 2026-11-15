# F6: does the census skill owe automated tests in this pr?

## .the fork
- add a suite for `rhx github.main-review.census` (its verdicts, help, and error paths)
- ship it proven only by controls and a branch-wise live run

## .taken
a hermetic play test, in this pr:
`src/practices/provision-github/github.main-review.census.play.declapract.integration.test.ts`.

- jest ignores `/.agent/`, so the test lives in `src/`, beside the practice whose evidence the
  census produces, and runs the skill by path. the husky `.play.` tests set the precedent: they run
  repo scripts from a practice dir
- a `gh` stub (`.test/assets/gh.stub.sh`) sits first on `PATH`. it serves canned json through the
  real `--jq` filter and logs each call, so the suite needs no token, no network, no rate limit
- it covers each verdict path, the tally and table (snapped), `--help`, each bad input (exit 2), an
  unknown owner (exit 2), a failed read (exit 1), and that every call is a read
- it bites: the old failhide (any failure read as absent) turns case4 red

## .rework
clean. the test pins the skill's contract; a contract change moves the snapshot in the same diff.

## .confidence
92%. the stub mirrors gh's observed responses (404, free-plan 403, 500). a gh change to its error
text would pass here and fail live; the live census run would show it.

## .verdict
superseded. the first guess (no suite) was disputed by the execution reviewers; the hermetic test
landed in its place.
