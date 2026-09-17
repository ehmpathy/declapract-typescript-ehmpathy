# fulcrum F-602-thresholds — the 30s/10s warn/notice thresholds are inherited, unexamined

- rework = clean
- status = open (best-guessed: keep the inherited 30s/10s)
- confidence = 60%

## the fork, stated fairly

the slow-test report flags a file at two grains: `>= 30s` → a warn annotation, `>= 10s` → a notice.
both numbers were carried forward from the prior (dead) report verbatim — no evidence was gathered on
whether they are the right cut for the suites that actually run. the fork:

- **keep 30/10 (took)** — inherit the prior thresholds; they are a reasonable default and changing
  them without data is a guess of its own.
- **re-derive from real suite data** — measure the actual per-file duration distribution across the
  org's suites and set the thresholds at meaningful percentiles.
- **make them configurable** — expose the two numbers as workflow inputs so a consumer tunes them.

## rework, and why clean

the thresholds are two literals in `report-slow-tests.sh` (`-ge 30`, `-ge 10`). a change is a
one-line edit plus a fixture; making them configurable is an argument-parse addition to the shell and
two `.test.yml` inputs. bounded, additive, covered by the play test — a clean follow-on either way.

## why keep-inherited was best-guessed

- #602 is a fix for a report that emitted no output at all; restoring a working report at the prior
  thresholds is the faithful repair. re-tuning the thresholds is a separate optimization with its own
  evidence bar, and to fold it in would scope-creep the fix.
- the numbers are not silent-failure-prone: a wrong threshold only mis-labels an annotation, it never
  hides a duration (the full ranked table is unconditional).

## where

- `src/practices/cicd-common/best-practice/.github/workflows/report-slow-tests.sh` (the `-ge 30` /
  `-ge 10` branches)

## verdict

open — the inherited 30/10 ships; a data-driven re-derive or a configurable pair awaits the wisher.
