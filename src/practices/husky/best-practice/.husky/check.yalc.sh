#!/bin/bash

# .what = block commit while package.json holds yalc references (local test links)
# .why  = a yalc link committed points at a folder only this machine holds, so every other
#         clone and ci fails to install
# .how  = first read the STAGED package.json, in plain sh, for a `file:.yalc/` or `link:.yalc/`
#         spec: the index is what the commit carries, so a link removed on disk but still
#         staged halts, and no node or yalc is needed to see it. then run `yalc check` where
#         yalc is installed. it exits 1 both when it finds references (after it prints
#         `Yalc dependencies found:` to stdout) and when it crashes, so the printed line splits
#         the two: references halt with a constraint error (exit 2), a crash halts with a
#         malfunction error (exit 1).
#
# https://github.com/wclr/yalc
#
# ⛔ this file is sourced by pre-commit, so it never exits on a pass: an exit here would end
#    pre-commit, and skip every check sourced after it

# fail fast on a fault or an unset var, as every peer hook does
set -eu

# halt when a read faults; a failed read never reads as clean
# reads named args: what=<the read that failed> tool=<the tool that faulted> fix=<the command that names the fault>
check_yalc_malfunction() {
  CHECK_YALC_MALFUNCTION_WHAT='the staged package.json'
  CHECK_YALC_MALFUNCTION_TOOL='git'
  CHECK_YALC_MALFUNCTION_FIX='git status'
  for CHECK_YALC_MALFUNCTION_ARG in "$@"; do
    case "$CHECK_YALC_MALFUNCTION_ARG" in
      what=*) CHECK_YALC_MALFUNCTION_WHAT="${CHECK_YALC_MALFUNCTION_ARG#what=}" ;;
      tool=*) CHECK_YALC_MALFUNCTION_TOOL="${CHECK_YALC_MALFUNCTION_ARG#tool=}" ;;
      fix=*) CHECK_YALC_MALFUNCTION_FIX="${CHECK_YALC_MALFUNCTION_ARG#fix=}" ;;
    esac
  done
  printf '💥 MalfunctionError: check.yalc could not read %s\n' "$CHECK_YALC_MALFUNCTION_WHAT" >&2
  printf '   ├─ why: a failed read halts the commit, never reads as clean\n' >&2
  printf '   └─ fix: repair %s (%s names the fault), then commit again\n' "$CHECK_YALC_MALFUNCTION_TOOL" "$CHECK_YALC_MALFUNCTION_FIX" >&2
  exit 1
}

# list package.json in the index: an empty list means none staged; a git fault halts, never reads as none
YALC_INDEX_ENTRY=$(git ls-files -- package.json) || check_yalc_malfunction what='the index' fix='git status'

# halt on a yalc spec in the staged package.json (an untracked package.json holds naught to commit)
if [ -n "$YALC_INDEX_ENTRY" ]; then
  # read the blob first, so a git fault halts on its own status and never reaches grep as empty input
  YALC_STAGED_JSON=$(git show :package.json) || check_yalc_malfunction what='the staged package.json' fix='git show :package.json'
  YALC_STAGED_STATUS=0
  YALC_STAGED_SPECS=$(printf '%s\n' "$YALC_STAGED_JSON" | grep -oE '"[^"]+": *"(file|link):\.yalc/[^"]*"') || YALC_STAGED_STATUS=$?
  if [ "$YALC_STAGED_STATUS" -gt 1 ]; then check_yalc_malfunction what='the staged package.json' tool='grep' fix='git show :package.json | grep -E file:.yalc'; fi
  if [ -n "$YALC_STAGED_SPECS" ]; then
    printf '✋ ConstraintError: the staged package.json has yalc references\n' >&2
    printf '   ├─ why: a yalc link points at a folder only this machine holds\n' >&2
    printf '%s\n' "$YALC_STAGED_SPECS" | sed 's/^/   ├─ found: /' >&2
    printf '   └─ fix: npx yalc remove --all && git add package.json\n' >&2
    exit 2
  fi
fi

if command -v node > /dev/null 2>&1 && [ -x ./node_modules/.bin/yalc ]; then
  YALC_CHECK_STATUS=0
  YALC_CHECK_OUTPUT=$(./node_modules/.bin/yalc check 2>&1) || YALC_CHECK_STATUS=$?
  if [ "$YALC_CHECK_STATUS" -ne 0 ]; then
    case "$YALC_CHECK_OUTPUT" in
      *'Yalc dependencies found'*)
        printf '✋ ConstraintError: package.json has yalc references\n' >&2
        printf '   ├─ why: a yalc link points at a folder only this machine holds\n' >&2
        printf '   ├─ yalc said: %s\n' "$YALC_CHECK_OUTPUT" >&2
        printf '   └─ fix: npx yalc remove --all\n' >&2
        exit 2
        ;;
      *)
        printf '💥 MalfunctionError: yalc check failed, so yalc references cannot be ruled out\n' >&2
        printf '   ├─ exit: %s\n' "$YALC_CHECK_STATUS" >&2
        printf '   ├─ output: %s\n' "$YALC_CHECK_OUTPUT" >&2
        printf '   └─ fix: repair yalc (reinstall node_modules), then commit again\n' >&2
        exit 1
        ;;
    esac
  fi
fi
