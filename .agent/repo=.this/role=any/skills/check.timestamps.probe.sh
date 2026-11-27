#!/usr/bin/env bash
######################################################################
# .what = run the check.timestamps hook itself over candidate lines or
#         over a corpus of files; print which halt and which pass
#
# .why  = a change to the hook's regex owes a fast read of which forms
#         it halts and which it lets through, before the slower jest
#         suite runs. the probe stages each candidate in a scratch repo
#         and runs the real hook on it, so its verdict is the hook's own
#         verdict: no copy of the pattern or the scan loop can drift
#
# usage:
#   rhx check.timestamps.probe --cases .temp/cases.txt
#   rhx check.timestamps.probe --cases .temp/cases.txt --hook <path>
#   rhx check.timestamps.probe --cases @tracked     # false-positive read
#   rhx check.timestamps.probe --cases @tracked --hook @head   # same read, old hook
#   rhx check.timestamps.probe --scan .behavior/<route>   # would a dir commit?
#   rhx check.timestamps.probe --cases .temp/cases.txt --show full   # the halt a dev sees
#
# options:
#   --cases   a file with one candidate line per line, or
#             @tracked to run every tracked file through the hook
#   --scan    a dir; run every file under it a commit could stage
#             (tracked, or untracked and not gitignored)
#             (exactly one of --cases or --scan is required)
#   --hook    the hook to run (it runs as code: pass only a hook you
#             trust), or @head for the practice hook as committed at
#             HEAD (to compare old vs new)
#             (default: src/practices/husky/best-practice/.husky/check.timestamps.sh)
#   --show    verdict | full. full also prints the hook's whole stderr for each
#             halt, as a dev at git commit would see it (default: verdict)
#
# guarantee:
#   - each verdict is the hook's exit: 2 = halt, 0 = pass
#   - corpus mode prints the first halted line per file, as a commit would
#   - any other hook exit halts the probe loud, with the hook's stderr
#   - exit 0 = probe ran; exit 1 = malfunction; exit 2 = bad input
######################################################################
set -euo pipefail

HOOK_PRACTICE="src/practices/husky/best-practice/.husky/check.timestamps.sh"

# halt on bad input: the caller must fix it
refuse() {
  echo "✋ ConstraintError: $1" >&2
  exit 2
}

# halt on a fault outside the caller's control
fault() {
  echo "💥 MalfunctionError: $1" >&2
  exit 1
}

# the hook's halt detail is its last tree line: `<path>:<line>:<text>`
get_halt_detail() {
  printf '%s' "${1##*└─ }"
}

# set `cleared` to the staged paths in hook order, through the one the halt names. the hook
# passed every path before it. the halted path is the staged path the detail starts with,
# matched as a prefix, so a colon inside a path is safe. no match halts loud, since a clear of
# the whole corpus would under-report
set_cleared_through_halt() {
  local path found=no
  cleared=()
  while IFS= read -r path; do
    cleared+=("$path")
    case "$2" in "$path:"[0-9]*) found=yes; break ;; esac
  done <<< "$1"
  [ "$found" = yes ] || fault "could not match the hook's halt line to a staged file: $2"
}

CASES=""
SCAN=""
HOOK="$HOOK_PRACTICE"
SHOW=verdict
while [ $# -gt 0 ]; do
  # a flag with no value is bad input, not a shell fault
  case "$1" in
    --cases | --hook | --scan | --show | --skill | --repo | --role)
      [ $# -ge 2 ] || refuse "$1 needs a value; see --help" ;;
  esac
  case "$1" in
    --cases) CASES="$2"; shift 2 ;;
    --hook) HOOK="$2"; shift 2 ;;
    --scan) SCAN="$2"; shift 2 ;;
    --show) SHOW="$2"; shift 2 ;;
    --skill | --repo | --role) shift 2 ;; # rhachet's own route args
    --help | -h) sed -n '/^####/,/^####/p' "$0"; exit 0 ;;
    *) refuse "unknown arg '$1'; see --help" ;;
  esac
done

# exactly one input: a mix would leave one silently unread
if [ -n "$CASES" ] && [ -n "$SCAN" ]; then refuse "pass --cases or --scan, not both"; fi
[ -n "$CASES" ] || [ -n "$SCAN" ] || refuse "pass --cases <file|@tracked> or --scan <dir>; see --help"
case "$SHOW" in verdict | full) ;; *) refuse "--show must be verdict or full, not '$SHOW'" ;; esac

# run from the repo root, so tracked paths and the practice hook path are found
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || refuse "run inside a git repo"
cd "$ROOT"

[ -z "$SCAN" ] || [ -d "$SCAN" ] || refuse "--scan dir not found: $SCAN"
[ -z "$CASES" ] || [ "$CASES" = "@tracked" ] || [ -f "$CASES" ] || refuse "--cases file not found: $CASES"

# a scratch repo holds the staged candidates; removed on exit
SCRATCH="$(mktemp -d)" || fault "mktemp could not make a scratch dir"
trap 'rm -rf "$SCRATCH"' EXIT
git -C "$SCRATCH" init -q || fault "git could not init a scratch repo"

# echo only the flags the caller named; keep --hook as typed, before @head resolves to a path
ECHO_FLAGS="--cases $CASES"
if [ -n "$SCAN" ]; then ECHO_FLAGS="--scan $SCAN"; fi
if [ "$HOOK" != "$HOOK_PRACTICE" ]; then ECHO_FLAGS="$ECHO_FLAGS --hook $HOOK"; fi

# @head runs the hook as committed at HEAD, so old vs new is one flag apart
if [ "$HOOK" = "@head" ]; then
  git show "HEAD:$HOOK_PRACTICE" > "$SCRATCH/.git/hook.head.sh" || fault "git could not read HEAD:$HOOK_PRACTICE"
  HOOK="$SCRATCH/.git/hook.head.sh"
fi
[ -f "$HOOK" ] || refuse "hook not found: $HOOK"
HOOK_ABS="$(cd "$(dirname "$HOOK")" && pwd)/$(basename "$HOOK")"

echo "🐢 lets ride..."
echo ""
echo "🐚 check.timestamps.probe $ECHO_FLAGS --show $SHOW"
echo "   └─ hook: $HOOK"
echo ""

# corpus mode reads files; cases mode reads lines
MODE=cases
if [ -n "$SCAN" ] || [ "$CASES" = "@tracked" ]; then MODE=corpus; fi

# --scan lists only files a commit could stage: tracked, plus untracked that git does not ignore
LS_ARGS=()
if [ -n "$SCAN" ]; then LS_ARGS=(--cached --others --exclude-standard -- "$SCAN"); fi

# corpus mode: copy each file into the scratch repo. a path with no regular file in the
# worktree (a deletion, a submodule) holds no content a commit would scan
scanned=0
if [ "$MODE" = corpus ]; then
  files=$(git -c core.quotepath=off ls-files ${LS_ARGS[@]+"${LS_ARGS[@]}"}) || fault "git could not list files"
  while IFS= read -r file; do
    [ -n "$file" ] && [ -f "$file" ] || continue
    mkdir -p "$SCRATCH/$(dirname "$file")"
    cp "$file" "$SCRATCH/$file" || fault "could not copy $file"
    scanned=$((scanned + 1))
  done <<< "$files"
fi

# cases mode: one scratch file per case line
if [ "$MODE" = cases ]; then
  n=0
  while IFS= read -r line || [ -n "$line" ]; do
    [ -n "$line" ] || continue
    n=$((n + 1))
    printf '%s\n' "$line" > "$SCRATCH/$(printf 'case.%04d.md' "$n")"
  done < "$CASES"
fi
git -C "$SCRATCH" add -A -- . || fault "git could not stage the candidates"

# run the hook until it passes. the hook scans staged files in name order and halts on the
# first hit, so each halt marks one file and clears every file before it as a pass
halted=()
while :; do
  status=0
  stderr=$(cd "$SCRATCH" && bash "$HOOK_ABS" 2>&1 1>/dev/null) || status=$?
  [ "$status" -eq 0 ] && break
  # any exit but a pass or a halt: show the hook's own stderr whole, as a child of the probe's header
  if [ "$status" -ne 2 ]; then
    echo "💥 MalfunctionError: the hook exited $status, neither a pass (0) nor a halt (2)" >&2
    {
      echo "   └─ hook stderr"
      echo "      ├─"
      echo "      │"
      printf '%s\n' "$stderr" | sed 's/^/      │  /'
      echo "      │"
      echo "      └─"
    } >&2
    exit 1
  fi
  detail="$(get_halt_detail "$stderr")"
  halted+=("$detail")
  # --show full: the halt as a dev sees it at `git commit`, word for word
  if [ "$SHOW" = full ]; then printf '$ git commit  # pre-commit: check.timestamps, exit 2\n%s\n\n' "$stderr"; fi
  staged=$(git -C "$SCRATCH" -c core.quotepath=off diff --cached --name-only) ||
    fault "git could not list the staged candidates"
  set_cleared_through_halt "$staged" "$detail"
  git -C "$SCRATCH" rm -q --cached -- "${cleared[@]}" || fault "git could not unstage through: $detail"
done

# corpus mode: the first halted line per file, then a count
if [ "$MODE" = corpus ]; then
  # a blank line parts the halt rows from the count; with no rows, the header's own gap serves
  for detail in ${halted[@]+"${halted[@]}"}; do printf 'halt\t%s\n' "$detail"; done
  if [ "${#halted[@]}" -gt 0 ]; then echo ""; fi
  # the scanned count tells a clean pass over many files from a scan that read none
  printf 'files halted: %s of %s\n' "${#halted[@]}" "$scanned"
  exit 0
fi

# cases mode: one verdict per line, in input order
n=0
while IFS= read -r line || [ -n "$line" ]; do
  [ -n "$line" ] || continue
  n=$((n + 1))
  v=pass
  for detail in ${halted[@]+"${halted[@]}"}; do
    case "$detail" in "$(printf 'case.%04d.md' "$n"):"*) v=halt ;; esac
  done
  printf '%s\t%s\n' "$v" "$line"
done < "$CASES"
