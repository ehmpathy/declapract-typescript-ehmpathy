#!/bin/bash

# .what = block commit of files whose staged content holds a secret key shape
# .why  = a key committed once ships to every clone and fork, forever; a rotation is the
#         only repair. a key shape (a vendor prefix plus a long random tail) is cheap to
#         spot before the commit, and costly to chase after it
# .how  = scan each staged blob for known key shapes; halt with a constraint error
#         (exit 2) that names the file, the line, and the shape — never the key itself

# fail fast on errors and unbound vars (safe here: every git read and scan is guarded by `||`,
# and all vars are assigned before use)
set -eu

# halt when a read or a scan faults; a fault never reads as a clean pass
# reads named args: what=<the step that failed> tool=<the tool that faulted> file=<the staged path, or none>
secrets_malfunction() {
  SECRETS_MALFUNCTION_WHAT='a step'
  SECRETS_MALFUNCTION_TOOL='git'
  SECRETS_MALFUNCTION_FILE='none'
  for SECRETS_MALFUNCTION_ARG in "$@"; do
    case "$SECRETS_MALFUNCTION_ARG" in
      what=*) SECRETS_MALFUNCTION_WHAT="${SECRETS_MALFUNCTION_ARG#what=}" ;;
      tool=*) SECRETS_MALFUNCTION_TOOL="${SECRETS_MALFUNCTION_ARG#tool=}" ;;
      file=*) SECRETS_MALFUNCTION_FILE="${SECRETS_MALFUNCTION_ARG#file=}" ;;
    esac
  done
  printf '💥 MalfunctionError: check.secrets could not %s\n' "$SECRETS_MALFUNCTION_WHAT" >&2
  if [ "$SECRETS_MALFUNCTION_FILE" != 'none' ]; then printf '   ├─ file: %s\n' "$SECRETS_MALFUNCTION_FILE" >&2; fi
  printf '   ├─ why: a failed read or scan halts the commit, never reads as clean\n' >&2
  # a git fault names itself in `git status`; a grep or sed fault prints its own words above
  if [ "$SECRETS_MALFUNCTION_TOOL" = 'git' ]; then printf '   └─ fix: repair git (git status names the fault), then commit again\n' >&2; fi
  if [ "$SECRETS_MALFUNCTION_TOOL" != 'git' ]; then printf '   └─ fix: repair %s (its own words print above), then commit again\n' "$SECRETS_MALFUNCTION_TOOL" >&2; fi
  exit 1
}

# the key shapes, one per line as `name|regex`. each regex starts at a word edge, so a
# vendor prefix inside a longer word (e.g. `disk-`) does not match. the first shape that
# matches names the key, so a narrow shape sits above a wide one that also matches it
# (`sk-ant-` is an anthropic key, though the openai-style shape would also match it)
EDGE='(^|[^A-Za-z0-9_])'
SHAPES="aws access key id|${EDGE}(AKIA|ASIA)[0-9A-Z]{16}([^0-9A-Z]|\$)
private key block|-----BEGIN [A-Z ]*PRIVATE KEY-----
github token|${EDGE}(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})
anthropic key|${EDGE}sk-ant-[A-Za-z0-9_-]{20,}
openai-style key|${EDGE}sk-(proj-)?[A-Za-z0-9_-]{20,}
xai key|${EDGE}xai-[A-Za-z0-9]{20,}
fireworks key|${EDGE}fw_[A-Za-z0-9]{20,}
slack token|${EDGE}xox[abposr]-[A-Za-z0-9-]{10,}
stripe secret key|${EDGE}(sk|rk)_live_[A-Za-z0-9]{16,}"

# collect staged files (added/copied/modified); skip deletions
# core.quotepath=off emits a non-ascii path raw, so `git show` below can read it
# --no-renames lists a moved-and-edited file as added, so its new lines are scanned; T keeps a type change
staged=$(git -c core.quotepath=off diff --cached --no-renames --name-only --diff-filter=ACMT) || secrets_malfunction what='list the staged files'

# scan each staged blob against each shape
# note: the here-docs feed the loops in the current shell (no pipe subshell),
#       so `exit 2` halts the commit directly and a clean pass falls through
while IFS= read -r file; do
  # skip empty lines
  [ -n "$file" ] || continue

  # read the staged blob; fail loud if git cannot read it
  content=$(git show ":$file") || secrets_malfunction what='read the staged blob' file="$file"

  # halt on the first shape found; print the line number only, so the key never echoes
  while IFS='|' read -r name regex; do
    [ -n "$name" ] || continue

    # grep exits 0 on a match, 1 on none, 2 on a fault; only a fault halts as a malfunction
    # (sh has no portable pipefail, so the status is read from grep itself)
    # LC_ALL=C reads bytes: under a utf-8 locale, grep -I would read a latin-1 file as binary and skip its key
    SECRETS_GREP_STATUS=0
    matches=$(printf '%s\n' "$content" | LC_ALL=C grep -nIE -e "$regex") || SECRETS_GREP_STATUS=$?
    [ "$SECRETS_GREP_STATUS" -le 1 ] || secrets_malfunction what="scan for the $name shape" tool='grep' file="$file"

    line=$(printf '%s\n' "$matches" | head -n 1 | cut -d: -f1)
    if [ -n "$line" ]; then
      printf '✋ ConstraintError: a secret key shape is staged\n' >&2
      printf '   ├─ shape: %s\n' "$name" >&2
      printf '   ├─ file: %s:%s\n' "$file" "$line" >&2
      printf '   └─ fix: remove it, and rotate the key if it ever left this machine\n' >&2
      exit 2
    fi
  done <<SHAPES_EOF
$SHAPES
SHAPES_EOF
done <<EOF
$staged
EOF
