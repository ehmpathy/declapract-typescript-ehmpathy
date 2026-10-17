#!/usr/bin/env bash
######################################################################
# .what = self-apply the husky timestamp hook + its lock to this repo's
#         own .husky/, with the lock stamped to the hook's git blob id
#
# .why  = the lock halts every commit when .husky/check.timestamps.sh
#         differs from the practice. each edit of the practice hook owes
#         a fresh copy plus a fresh stamp here; this does both in one call
#
# usage:
#   rhx husky.lock.restamp
#
# guarantee:
#   - copies the practice hook to .husky/check.timestamps.sh
#   - writes .husky/check.timestamps.lock.sh = the practice lock with
#     __EXPECTED_BLOB__ replaced by `git hash-object` of the hook
#   - idempotent: a rerun on a stamped repo changes zero bytes
#   - exit 0 = stamped, 1 = malfunction
######################################################################
set -euo pipefail

# print usage on --help / -h, with no write (rhx passes its own args too, so scan them all)
for arg in "$@"; do
  case "$arg" in
    --help | -h)
      echo "🐢 heres the wave..."
      echo ""
      echo "🐚 husky.lock.restamp"
      echo "   ├─ usage: rhx husky.lock.restamp"
      echo "   ├─ copies src/practices/husky/best-practice/.husky/check.timestamps.sh to .husky/"
      echo "   └─ stamps .husky/check.timestamps.lock.sh with the hook's git blob id"
      exit 0
      ;;
  esac
done

ROOT="$(git rev-parse --show-toplevel)"
SRC="$ROOT/src/practices/husky/best-practice/.husky"
DST="$ROOT/.husky"

# fail loud if the practice files are absent
for f in check.timestamps.sh check.timestamps.lock.sh; do
  if [ ! -f "$SRC/$f" ]; then
    echo "💥 MalfunctionError: practice file absent: $SRC/$f" >&2
    exit 1
  fi
done

# copy the hook, then stamp the lock with the hook's blob id
cp "$SRC/check.timestamps.sh" "$DST/check.timestamps.sh"
BLOB="$(git hash-object -- "$DST/check.timestamps.sh")"
LOCK="$(cat "$SRC/check.timestamps.lock.sh")"
printf '%s\n' "${LOCK/__EXPECTED_BLOB__/$BLOB}" > "$DST/check.timestamps.lock.sh"

echo "🐢 righteous!"
echo ""
echo "🐚 husky.lock.restamp"
echo "   ├─ hook: .husky/check.timestamps.sh"
echo "   └─ lock: .husky/check.timestamps.lock.sh = $BLOB"
