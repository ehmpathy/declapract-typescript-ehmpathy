#!/bin/bash

# .what = remind to install when a checkout, merge, or rewrite changed a lockfile
# .why  = a stale node_modules after a lockfile change fails in odd ways, far from the cause
# .how  = read the files changed since the prior HEAD; where that read fails (a fresh clone has no
#         prior HEAD in its reflog), every present lockfile may be new, so the reminder still shows

# fail fast on a fault or an unset var, as every peer hook does
set -eu

# read the changed files first, so a failed read is named rather than swallowed by a grep
LOCKFILE_CHANGED_ALL=''
LOCKFILE_COMPARED='true'
LOCKFILE_CHANGED_ALL=$(git diff --name-only 'HEAD@{1}' HEAD 2>/dev/null) || LOCKFILE_COMPARED='false'

# .what = whether the named lockfile changed, or may have where no comparison was possible
# reads named args: file=<the lockfile path>
lockfile_changed() {
  LOCKFILE_CHANGED_FILE=''
  for LOCKFILE_CHANGED_ARG in "$@"; do
    case "$LOCKFILE_CHANGED_ARG" in
      file=*) LOCKFILE_CHANGED_FILE="${LOCKFILE_CHANGED_ARG#file=}" ;;
    esac
  done
  if [ "$LOCKFILE_COMPARED" = 'false' ]; then
    [ -f "$LOCKFILE_CHANGED_FILE" ]
    return
  fi
  printf '%s\n' "$LOCKFILE_CHANGED_ALL" | grep -qx -- "$LOCKFILE_CHANGED_FILE"
}

# name why the reminder shows where no comparison was possible
LOCKFILE_REASON='changed'
[ "$LOCKFILE_COMPARED" = 'true' ] || LOCKFILE_REASON='may have changed (no prior HEAD in the reflog to compare)'

if lockfile_changed file='package-lock.json'; then
  echo "📦 package-lock.json ${LOCKFILE_REASON}. Run 'npm install' to update your locally installed dependencies."
fi

if lockfile_changed file='pnpm-lock.yaml'; then
  echo "📦 pnpm-lock.yaml ${LOCKFILE_REASON}. Run 'pnpm install' to update your locally installed dependencies."
fi
