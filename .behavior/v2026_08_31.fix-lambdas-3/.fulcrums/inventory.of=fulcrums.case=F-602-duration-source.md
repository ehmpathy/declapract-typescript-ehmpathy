# fulcrum F-602-duration-source — read endTime-startTime, or pin a duration-emitting reporter

- rework = clean
- status = open (best-guessed: wall-clock span; a reporter swap is a follow-on)
- confidence = 70%

## the fork, stated fairly

radio #602: the slow-test report filtered on `perfStats.runtime`, a key jest 30 dropped, so it
matched zero rows and went silent-green for its whole life. two ways to source a per-file duration
from a jest 30 run:

- **wall-clock span (took)** — read `endTime - startTime` off each `testResults[]` entry in the
  `--json` output. no new dependency; the two epoch-ms fields are what jest 30 still emits.
- **a pinned reporter** — add a jest reporter (e.g. `jest-slow-test-reporter`) that emits per-file
  durations in a stable schema, and parse its artifact instead of the `--json` shape.

## rework, and why clean

the report is one shelled-out `report-slow-tests.sh` behind a single `run:` line in `.test.yml`,
covered by a play test. a swap to a reporter is a rewrite of that one shell plus its fixtures — no
consumer is hardened against the current shape (the shell is a shipped template, applied whole), so
either arm is a clean follow-on, never a teardown.

## why the wall-clock span was best-guessed

- it removes a dependency rather than adds one — the failure this fixes was a schema the report did
  not control, and a third-party reporter re-introduces exactly that coupling.
- the go-forward is defended against its own recurrence: the shell fails LOUD (exit 1 + `::error::`)
  when a non-empty report yields zero real durations, so the next schema drift reddens a gate instead
  of a silent-green.

## where

- `src/practices/cicd-common/best-practice/.github/workflows/report-slow-tests.sh`
- `src/practices/cicd-common/report-slow-tests.play.declapract.integration.test.ts`

## verdict

open — the wall-clock span ships; a reporter swap awaits the wisher if per-file granularity below the
file grain is ever wanted.
