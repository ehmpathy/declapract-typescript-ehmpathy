#!/usr/bin/env bash
######################################################################
# .what = report the value of one git attribute for each given path,
#         as git itself computes it
#
# .why  = a `.gitattributes` reads by last-match-wins, and a line order
#         that looks right can still lose (an override above a broader
#         line). only git can say which line won. `git check-attr` is
#         read-only, yet not a paved call on its own
#
# usage:
#   rhx git.attr.get --attr linguist-generated --paths 'src/a.test.ts .route/x/1.vision.yield.md'
#   printf '%s\n' 'docs/my file.md' | rhx git.attr.get --attr linguist-generated --paths @stdin
#
# options:
#   --attr    the attribute name (required), e.g. linguist-generated, diff
#   --paths   space-separated repo-relative paths, or @stdin for one per
#             line (required). a path with a space goes via @stdin. a path
#             need not exist; attributes are path-based
#
# guarantee:
#   - read-only: runs `git check-attr` only; writes naught
#   - the skill's stdout holds only git's lines, one per path:
#     `<path>: <attr>: set | unset | unspecified | <value>`
#     its banner goes to stderr. via rhx, stderr shows only on a
#     failure, so a success prints rhx's header, then git's lines
#   - a `--paths` split that broke an extant file with a space fails
#     loud, and names the @stdin call that keeps it whole. a spaced path
#     that does not exist cannot be told from two paths, so it splits;
#     the banner names the split count. pass any spaced path via @stdin
#   - a path set that names no path (a blank `--paths`, an empty pipe)
#     fails loud, before git runs
#   - exit 0 = reported, 1 = git failed, 2 = bad input (incl a path
#     outside the repo) or no repo
######################################################################
set -euo pipefail

ATTR=""
PATHS=""

# emit a constraint error with its fix, then exit 2
fail_constraint() {
  local what="$1"
  local fix="$2"
  echo "✋ ConstraintError: $what" >&2
  echo "   └─ fix: $fix" >&2
  exit 2
}

# emit a malfunction error for a failed git step, then exit 1
fail_malfunction() {
  echo "💥 MalfunctionError: $1 failed" >&2
  echo "   └─ fix: read git's message above, repair the cause, then rerun" >&2
  exit 1
}

# reject a flag that arrives with no value
require_value() {
  local flag="$1"
  local value="$2"
  if [[ -z "$value" || "$value" == --* ]]; then
    fail_constraint "$flag needs a value" "rhx git.attr.get --attr ${ATTR:-linguist-generated} --paths 'src/a.test.ts'"
  fi
}

# parse named args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --attr) require_value "$1" "${2:-}"; ATTR="$2"; shift 2 ;;
    --paths) require_value "$1" "${2:-}"; PATHS="$2"; shift 2 ;;
    --skill|--repo|--role) shift; [[ $# -gt 0 ]] && shift ;; # rhx forwards its own selectors; not ours to read
    --help|-h)
      awk 'NR > 2 && /^####/ { exit } NR > 2 { sub(/^# ?/, ""); print }' "$0"
      exit 0
      ;;
    *)
      fail_constraint "unknown option '$1'" "rhx git.attr.get --attr linguist-generated --paths 'src/a.test.ts'"
      ;;
  esac
done

# reject absent inputs
if [[ -z "$ATTR" || -z "$PATHS" ]]; then
  fail_constraint "--attr and --paths are both required" "rhx git.attr.get --attr ${ATTR:-linguist-generated} --paths 'src/a.test.ts'"
fi

# reject an attr name git would refuse: letters, digits, `-`, `.`, `_`; no lead `-`
if [[ ! "$ATTR" =~ ^[A-Za-z0-9._][-A-Za-z0-9._]*$ ]]; then
  fail_constraint "'$ATTR' is not a valid attribute name" "rhx git.attr.get --attr linguist-generated --paths 'src/a.test.ts'"
fi

# reject @stdin with no pipe; git would wait on the terminal
if [[ "$PATHS" == "@stdin" && -t 0 ]]; then
  fail_constraint "--paths @stdin needs paths piped in" "printf '%s\\n' 'src/a.test.ts' | rhx git.attr.get --attr $ATTR --paths @stdin"
fi

# locate the repo root; outside a repo is the caller's to fix, any other git error is not
ROOT_STATUS=0
ROOT="$(LC_ALL=C git rev-parse --show-toplevel 2>&1)" || ROOT_STATUS=$?
if [[ $ROOT_STATUS -ne 0 && "$ROOT" == *"not a git repository"* ]]; then
  fail_constraint "not inside a git repo" "run from within the repo whose attributes you want"
fi
if [[ $ROOT_STATUS -ne 0 ]]; then
  echo "$ROOT" >&2
  fail_malfunction "git rev-parse"
fi
cd "$ROOT"

# split the flag value on spaces; @stdin reads one path per line
PATH_LIST=()
STDIN_PATHS=""
PATHS_SOURCE="from stdin, one per line"
if [[ "$PATHS" != "@stdin" ]]; then
  read -r -a PATH_LIST <<< "$PATHS"
  PATHS_SOURCE="${#PATH_LIST[@]}, split on spaces; a path with a space goes via @stdin"
fi
if [[ "$PATHS" == "@stdin" ]]; then
  STDIN_PATHS="$(cat)"
fi

# reject a path set that names no path: a blank --paths, or a pipe that sent naught
if [[ "$PATHS" != "@stdin" && ${#PATH_LIST[@]} -eq 0 ]]; then
  fail_constraint "--paths named no path" "rhx git.attr.get --attr $ATTR --paths 'src/a.test.ts'"
fi
if [[ "$PATHS" == "@stdin" && -z "${STDIN_PATHS//[[:space:]]/}" ]]; then
  fail_constraint "--paths @stdin got no path from the pipe" "printf '%s\\n' 'src/a.test.ts' | rhx git.attr.get --attr $ATTR --paths @stdin"
fi

# reject a split that broke a path with a space: two adjacent parts that name one file.
# it runs before the banner, so every ConstraintError keeps one shape
for ((i = 0; i + 1 < ${#PATH_LIST[@]}; i++)); do
  PATH_JOINED="${PATH_LIST[i]} ${PATH_LIST[i + 1]}"
  if [[ ! -e "${PATH_LIST[i]}" && -e "$PATH_JOINED" ]]; then
    fail_constraint "'$PATH_JOINED' holds a space, so --paths split it in two" "printf '%s\\n' '$PATH_JOINED' | rhx git.attr.get --attr $ATTR --paths @stdin"
  fi
done

# banner to stderr, so stdout holds only git's lines; it names how the paths were read
{
  echo "🐢 lets peek..."
  echo ""
  echo "🐚 git.attr.get --attr $ATTR"
  echo "   ├─ paths: $PATHS_SOURCE"
  echo "   └─ git check-attr, last match wins"
  echo ""
} >&2

# run git check-attr: its lines go to stdout via fd 3, its errors are kept to classify.
# a path outside the repo is the caller's to fix; any other git failure is not
report_attrs() {
  local status=0
  local err
  err="$(LC_ALL=C git check-attr "$@" 2>&1 1>&3)" || status=$?
  if [[ -n "$err" ]]; then
    echo "$err" >&2
  fi
  if [[ $status -ne 0 && "$err" == *"outside repository"* ]]; then
    fail_constraint "a path lies outside this repo" "pass repo-relative paths, e.g. --paths 'src/a.test.ts'"
  fi
  if [[ $status -ne 0 ]]; then
    fail_malfunction "git check-attr"
  fi
}
exec 3>&1

# report each path's computed value, from stdin
if [[ "$PATHS" == "@stdin" ]]; then
  report_attrs --stdin "$ATTR" <<< "$STDIN_PATHS"
  exit 0
fi

# report each path's computed value, from the flag
report_attrs "$ATTR" -- "${PATH_LIST[@]}"
