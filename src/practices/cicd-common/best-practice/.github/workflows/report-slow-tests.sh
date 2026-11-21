#!/usr/bin/env bash
######################################################################
# .what = rank test files by wall-clock duration from a jest --json report
#
# .why  = jest 30 dropped the perfStats key that the prior report filtered on
#         (`perfStats.runtime`), so the filter matched zero rows and the report
#         went silent-green for its whole life. endTime-startTime
#         (epoch ms) is the only per-file duration jest 30 still emits, so read
#         the wall-clock span instead — and fail LOUD if a future schema change
#         zeroes it again, never silent-green.
#
# usage:
#   report-slow-tests.sh [jest-results.json]
#
# guarantee:
#   - exit 0 = report written to $GITHUB_STEP_SUMMARY (or /dev/null locally)
#   - exit 0 = empty shard (0 test files) — a legitimate state, stated explicitly
#   - exit 0 = no file ran a test (each was skipped) — no duration to rank, stated explicitly
#   - exit 1 = files that ran a test yielded zero real durations (schema drift)
#   - exit 1 = jest counts tests that ran, yet no file shows one (schema drift)
#   - exit 1 = jest counts tests that ran, yet the report holds no testResults entry (schema drift)
#   - exit 1 = the report is not valid json (a runner killed mid-write)
######################################################################
set -eu

results="${1:-jest-results.json}"

# a corrupt report is named as one, never mistaken for schema drift
if ! jq empty "$results"; then
  echo "::error::💥 MalfunctionError: slow-test report could not parse $results as json — the jest run likely ended mid-write; read the test step above for why it stopped"
  exit 1
fi

# a file "ran" when at least one of its tests passed or failed. a skipped file (credential-gated,
# a `runIf`) reports startTime == endTime, so it carries no duration and must not read as drift
# .note = jest --json holds no per-file test counts; `status` and `assertionResults[].status` it does
ran_filter='[.testResults[]? | select(any(.assertionResults[]?; .status == "passed" or .status == "failed"))]'

total=$(jq '.testResults // [] | length' "$results")
ran=$(jq "$ran_filter | length" "$results")
durations=$(jq -r "$ran_filter | .[] | \"\\((.endTime // 0) - (.startTime // 0)):\\(.name)\"" "$results" | sort -t: -k1 -rn)

summary="${GITHUB_STEP_SUMMARY:-/dev/null}"

# a count beside its noun, plural unless the count is one: `1 test file`, `2 test files`
# reads named args: count=<n> noun=<singular noun>
asCountedNoun() {
  local count="" noun=""
  for arg in "$@"; do
    case "$arg" in
      count=*) count="${arg#count=}" ;;
      noun=*) noun="${arg#noun=}" ;;
    esac
  done
  if [[ "$count" -eq 1 ]]; then echo "$count $noun"; return; fi
  echo "$count ${noun}s"
}

# the run-level counts must agree that no test ran; if jest counts tests the per-file read
# cannot see (a moved `testResults` or `status` field), that is schema drift, never a quiet
# "empty shard" or "skipped". checked first, so neither exit below can mask it
tests_ran=$(jq '(.numPassedTests // 0) + (.numFailedTests // 0)' "$results")
if [[ "$total" -eq 0 && "$tests_ran" -gt 0 ]]; then
  echo "::error::💥 MalfunctionError: slow-test report found $(asCountedNoun count="$tests_ran" noun=test) that ran yet no testResults entry at all — the jest --json testResults array likely moved or was renamed; read the top-level keys of $results to see where it went"
  exit 1
fi
if [[ "$ran" -eq 0 && "$tests_ran" -gt 0 ]]; then
  echo "::error::💥 MalfunctionError: slow-test report found $(asCountedNoun count="$tests_ran" noun=test) that ran yet 0 test files with a passed or failed test — the jest --json testResults schema likely changed; read testResults[].assertionResults[].status in $results to see what moved"
  exit 1
fi

# an empty shard (no matched files) is legitimate — say so explicitly, never fail.
if [[ "$total" -eq 0 ]]; then
  printf '### slowest test files\n\nslow-test report: 0 test files in %s (empty shard)\n' "$results" >> "$summary"
  exit 0
fi

# a shard whose every file was skipped, or failed before its first test, ran no test, so it has
# no duration to rank — say so, never fail (a file that failed to run fails the test step itself)
if [[ "$ran" -eq 0 ]]; then
  printf '### slowest test files\n\nslow-test report: %s in %s, none ran a test (each was skipped, or failed before its first test)\n' "$(asCountedNoun count="$total" noun='test file')" "$results" >> "$summary"
  exit 0
fi

# files that ran a test yet yield zero real durations mean the jest --json duration schema
# changed again — the silent death this check exists to catch. fail loud, never silent-green.
nonzero=$(printf '%s\n' "$durations" | awk -F: '$1 > 0' | wc -l | tr -d ' ')
if [[ "$nonzero" -eq 0 ]]; then
  echo "::error::💥 MalfunctionError: slow-test report parsed 0 durations from $(asCountedNoun count="$ran" noun='test file') that ran a test — the jest --json duration schema likely changed; read endTime/startTime from one entry of $results to see what moved"
  exit 1
fi

# a ranked table into the step summary — annotations cannot be sorted, and a diagnosis
# needs the order (the single slowest file sets the suite's wall-clock floor).
{
  echo "### slowest test files"
  echo ""
  echo "| duration | file |"
  echo "| --- | --- |"
  printf '%s\n' "$durations" | while IFS=: read -r ms name; do
    [ -z "$name" ] && continue
    printf '| %ds | %s |\n' "$((ms / 1000))" "$name"
  done
} >> "$summary"

# inline annotations flag the outliers at their file (the 30s/10s thresholds are inherited).
printf '%s\n' "$durations" | while IFS=: read -r ms name; do
  [ -z "$name" ] && continue
  seconds=$((ms / 1000))
  if [[ $seconds -ge 30 ]]; then
    echo "::warning file=${name}::slow test: ${seconds}s"
  elif [[ $seconds -ge 10 ]]; then
    echo "::notice file=${name}::test duration: ${seconds}s"
  fi
done
