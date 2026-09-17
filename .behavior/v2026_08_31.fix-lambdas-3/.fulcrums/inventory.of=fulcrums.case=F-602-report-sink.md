# fulcrum F-602-report-sink — step-summary table + annotations, or an artifact, or both

- rework = clean
- status = open (best-guessed: step summary + inline annotations)
- confidence = 65%

## the fork, stated fairly

where the slow-test report lands for a human to read. three sinks, each valid:

- **step summary + inline annotations (took)** — a ranked markdown table into `$GITHUB_STEP_SUMMARY`
  (annotations cannot be sorted, so the table carries the order), plus `::warning`/`::notice`
  annotations that flag the outliers at their file.
- **an artifact upload** — write the ranked report to a file and `actions/upload-artifact`, so it
  survives as a downloadable record beyond the run's summary pane.
- **both** — the summary for at-a-glance, the artifact for retention/trend.

## rework, and why clean

the sink is the tail of `report-slow-tests.sh` — the `>> "$summary"` block and the annotation loop.
an artifact upload is a new `.test.yml` step plus a file write in the shell; a bounded, additive
change to one shipped template, covered by the play test. no consumer depends on the current sink, so
any arm is a clean follow-on.

## why summary + annotations was best-guessed

- it needs no new workflow step and no retention config — the summary pane is where a reviewer
  already looks after a run.
- the annotations put the outlier at its file line, which is the diagnosis a maintainer wants first;
  the sorted table answers "what set the wall-clock floor".

## where

- `src/practices/cicd-common/best-practice/.github/workflows/report-slow-tests.sh` (the sink block)
- `src/practices/cicd-common/best-practice/.github/workflows/.test.yml` (the `run:` step)

## verdict

open — summary + annotations ships; an artifact upload awaits the wisher if a durable trend record is
ever wanted.
