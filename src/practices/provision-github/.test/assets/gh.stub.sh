#!/usr/bin/env bash
######################################################################
# .what = a hermetic stand-in for `gh`, for the census play test
#
# .why  = the census reads github; a test must not. this stub serves
#         canned json from $GH_STUB_DIR, filtered by the --jq it was
#         given (as gh does), and logs every call to $GH_STUB_DIR/calls.log
#
# fixtures, keyed by the call (each '/' in the key becomes '__'):
#   api --method GET <path>     → api__<path>.json
#   pr list --repo <slug> ...   → pr__<slug>.json
#   repo list <owner> ...       → repo__<owner>.json
#   a <key>.err file instead    → its text on stderr, exit 1
#   neither                     → 'gh: Not Found (HTTP 404)', exit 1
######################################################################
set -euo pipefail

printf '%s\n' "$*" >> "$GH_STUB_DIR/calls.log"

jqf='.'
args=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --jq) jqf="$2"; shift 2 ;;
    *) args+=("$1"); shift ;;
  esac
done

case "${args[0]:-} ${args[1]:-}" in
  'api --method') key="api/${args[3]}" ;;
  'pr list') key="pr/${args[3]}" ;;
  'repo list') key="repo/${args[2]}" ;;
  *) echo "gh stub: unknown call: ${args[*]}" >&2; exit 9 ;;
esac

file="$GH_STUB_DIR/${key//\//__}"
if [[ -f "$file.err" ]]; then cat "$file.err" >&2; exit 1; fi
if [[ ! -f "$file.json" ]]; then echo 'gh: Not Found (HTTP 404)' >&2; exit 1; fi
jq -r "$jqf" "$file.json"
