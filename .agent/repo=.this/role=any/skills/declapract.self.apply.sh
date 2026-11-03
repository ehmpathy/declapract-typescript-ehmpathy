#!/usr/bin/env bash
######################################################################
# .what = apply one practice's declaration of one file to THIS repo
#
# .why  = this repo consumes the practices it declares (`useCase:
#         npm-package`). when a practice's output changes, this repo's own
#         copy of the file owes the new output, driven by the practice and
#         never by hand. the declarations load from the compiled `dist/`, so a stale build
#         applies a stale practice; and `npx declapract apply` is not a
#         paved call on its own
#
# usage:
#   rhx declapract.self.apply --practice git --file .gitattributes
#   rhx declapract.self.apply --practice rhachet --file .gitattributes --build skip
#
# options:
#   --practice  the practice to apply (required)
#   --file      the repo-relative file to scope the apply to (required)
#   --build     run | skip — compile dist/ first (default: run)
#
# guarantee:
#   - compiles dist/ first unless --build skip, so the apply reads the
#     declarations as they stand in src/. dist/ is gitignored build output;
#     the build regenerates it and moves no tracked file
#   - scopes the apply to one practice and one file; no other tracked
#     file moves
#   - runs the apply in an isolated root outside the repo, which holds
#     only the use config, package.json, the one file, and links to the
#     paths the declare config names. declapract globs with symlinks
#     followed, so a root inside the repo walks every leftover test repo
#     under .temp/ and can run out of memory. the one file is copied back
#   - a check sees only those files; a check that reads another repo file
#     sees it absent
#   - output passes through unmodified, then names what this apply did
#     to the file, apart from its diff vs HEAD (`git diff --shortstat`):
#     written | rewritten | unchanged, already converged | removed |
#     absent before and after, no fix wrote it. a file HEAD never held
#     reads `vs HEAD: new file, absent from HEAD` if present, else
#     `vs HEAD: no diff, absent at HEAD too`
#   - a practice the declarations do not hold, a practice name that is a
#     path, or a --file outside the repo, fails loud before the apply runs
#   - exit 0 = applied, 1 = a git, build, apply, or diff step failed,
#     2 = bad input, no repo, or no declapract config
######################################################################
set -euo pipefail

PRACTICE=""
FILE=""
BUILD="run"
FIX_DEFAULT="rhx declapract.self.apply --practice git --file .gitattributes"

# emit a constraint error with its fix (a call to copy, unless a fix is named), then exit 2
fail_constraint() {
  echo "✋ ConstraintError: $1" >&2
  echo "   └─ fix: ${2:-$FIX_DEFAULT}" >&2
  exit 2
}

# emit a malfunction error for a failed step, then exit 1
fail_malfunction() {
  echo "💥 MalfunctionError: $1 failed" >&2
  echo "   └─ fix: read the $1 output above, repair the cause, then rerun" >&2
  exit 1
}

# reject a flag that arrives with no value
require_value() {
  if [[ -z "$2" || "$2" == --* ]]; then
    fail_constraint "$1 needs a value"
  fi
}

# parse args; rhx injects --skill/--repo/--role, which this skill ignores
while [[ $# -gt 0 ]]; do
  case "$1" in
    --practice) require_value "$1" "${2:-}"; PRACTICE="$2"; shift 2 ;;
    --file) require_value "$1" "${2:-}"; FILE="$2"; shift 2 ;;
    --build) require_value "$1" "${2:-}"; BUILD="$2"; shift 2 ;;
    --skill|--repo|--role) shift; [[ $# -gt 0 ]] && shift ;;
    -h|--help)
      awk 'NR > 2 && /^####/ { exit } NR > 2 { sub(/^# ?/, ""); print }' "$0"
      exit 0
      ;;
    *)
      fail_constraint "unknown option '$1'"
      ;;
  esac
done

# reject absent or malformed input
if [[ -z "$PRACTICE" || -z "$FILE" ]]; then
  fail_constraint "--practice and --file are required"
fi
if [[ "$BUILD" != "run" && "$BUILD" != "skip" ]]; then
  fail_constraint "--build must be run or skip, got '$BUILD'"
fi
if [[ "$PRACTICE" == .* || "$PRACTICE" == */* ]]; then
  fail_constraint "--practice names a practice dir, not a path, got '$PRACTICE'"
fi
if [[ "$FILE" == /* || "$FILE" == ".."|| "$FILE" == ../* || "$FILE" == */../* || "$FILE" == */.. ]]; then
  fail_constraint "--file must be a path inside the repo, relative to its root, got '$FILE'" "rhx declapract.self.apply --practice $PRACTICE --file .gitattributes"
fi

# locate the repo root; outside a repo is the caller's to fix, any other git error is not
ROOT_STATUS=0
ROOT="$(LC_ALL=C git rev-parse --show-toplevel 2>&1)" || ROOT_STATUS=$?
if [[ $ROOT_STATUS -ne 0 && "$ROOT" == *"not a git repository"* ]]; then
  fail_constraint "not inside a git repo; run from within this repo"
fi
if [[ $ROOT_STATUS -ne 0 ]]; then
  echo "$ROOT" >&2
  fail_malfunction "git rev-parse"
fi
cd "$ROOT"

# reject a repo with no declapract config; the apply has naught to read
if [[ ! -f declapract.use.yml ]]; then
  fail_constraint "no declapract.use.yml at the repo root" "run from a repo that consumes declapract, with declapract.use.yml at its root"
fi

echo "🐢 lets ride..."
echo ""
echo "🐚 declapract.self.apply --practice $PRACTICE --file $FILE --build $BUILD"
echo "   ├─ build: $BUILD"
echo "   └─ apply: declapract apply --practice $PRACTICE --file $FILE, in an isolated root"
echo ""

# compile dist/, so the apply reads the declarations as they stand in src/
if [[ "$BUILD" == "run" ]]; then
  npm run build || fail_malfunction "build"
fi

# locate the declare config the use config names: a dir holds declapract.declare.yml
DECLARED="$(sed -n "s/^declarations:[[:space:]]*['\"]\{0,1\}\([^'\"#]*\)['\"]\{0,1\}.*$/\1/p" declapract.use.yml | head -n 1)"
DECLARED="${DECLARED%"${DECLARED##*[![:space:]]}"}"
if [[ -z "$DECLARED" ]]; then
  fail_constraint "declapract.use.yml names no declarations path" "add a line to declapract.use.yml: declarations: '<path to declapract.declare.yml, or its dir>'"
fi
DECLARE_FILE="$ROOT/$DECLARED"
if [[ -d "$DECLARE_FILE" ]]; then
  DECLARE_FILE="$DECLARE_FILE/declapract.declare.yml"
fi
if [[ ! -f "$DECLARE_FILE" ]]; then
  fail_constraint "no declare config at $DECLARED (named in declapract.use.yml)" "point declarations: in declapract.use.yml at a file or dir that holds declapract.declare.yml"
fi
DECLARE_DIR="$(dirname "$DECLARE_FILE")"

# reject a practice the declarations do not hold; declapract applies naught for it, in silence
PRACTICES_PATH="$(sed -n "s/^[[:space:]]\{1,\}practices:[[:space:]]*['\"]\{0,1\}\([^'\"#]*\)['\"]\{0,1\}.*$/\1/p" "$DECLARE_FILE" | head -n 1)"
PRACTICES_PATH="${PRACTICES_PATH%"${PRACTICES_PATH##*[![:space:]]}"}"
PRACTICES_DIR="$DECLARE_DIR/${PRACTICES_PATH:-practices}"
if [[ ! -d "$PRACTICES_DIR/$PRACTICE" ]]; then
  mapfile -t PRACTICES_KNOWN < <(find -L "$PRACTICES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' 2>/dev/null | sort)
  if [[ ${#PRACTICES_KNOWN[@]} -eq 0 ]]; then
    fail_constraint "no practice '$PRACTICE' in ${PRACTICES_PATH:-practices}, which holds none" "rhx declapract.self.apply --practice $PRACTICE --file $FILE --build run"
  fi
  echo "✋ ConstraintError: no practice '$PRACTICE' in ${PRACTICES_PATH:-practices}" >&2
  echo "   ├─ held practices" >&2
  for ((i = 0; i < ${#PRACTICES_KNOWN[@]}; i++)); do
    GLYPH="├─"
    [[ $i -eq $((${#PRACTICES_KNOWN[@]} - 1)) ]] && GLYPH="└─"
    echo "   │  $GLYPH ${PRACTICES_KNOWN[i]}" >&2
  done
  echo "   │" >&2
  echo "   └─ fix: rhx declapract.self.apply --practice ${PRACTICES_KNOWN[0]} --file $FILE" >&2
  exit 2
fi

# build the isolated root, outside the repo: the use config, package.json, the one file,
# and a declarations dir that links only the paths the declare config names. declapract
# globs from its root with symlinks followed, so a root inside the repo walks every
# leftover test repo under .temp/; outside, it walks only what this apply reads
ISOLATED="$(mktemp -d)"
trap 'rm -rf "$ISOLATED"' EXIT
mkdir -p "$ISOLATED/declarations"
cp "$DECLARE_FILE" "$ISOLATED/declarations/declapract.declare.yml"
sed -n 's/^[[:space:]]\{1,\}[a-z-]\{1,\}:[[:space:]]*\(.*\)$/\1/p' "$DECLARE_FILE" \
  | sed "s/['\"]//g; s|^\./||; s|/.*$||" | sort -u \
  | while read -r SEGMENT; do
      if [[ -n "$SEGMENT" && -e "$DECLARE_DIR/$SEGMENT" ]]; then
        ln -s "$DECLARE_DIR/$SEGMENT" "$ISOLATED/declarations/$SEGMENT"
      fi
    done
sed "s|^declarations:.*$|declarations: ./declarations/declapract.declare.yml|" \
  declapract.use.yml > "$ISOLATED/declapract.use.yml"
if [[ -f package.json ]]; then
  cp package.json "$ISOLATED/package.json"
fi
FILE_EXTANT="false"
SUM_BEFORE="absent"
if [[ -f "$FILE" ]]; then
  FILE_EXTANT="true"
  SUM_BEFORE="$(cksum < "$FILE")"
  mkdir -p "$ISOLATED/$(dirname "$FILE")"
  cp "$FILE" "$ISOLATED/$FILE"
fi

# apply the one practice to the one file, inside the isolated root
(cd "$ISOLATED" && "$ROOT/node_modules/.bin/declapract" apply --practice "$PRACTICE" --file "$FILE") \
  || fail_malfunction "apply"

# carry the one file back: written or rewritten, or removed if the fix removed it
if [[ -f "$ISOLATED/$FILE" ]]; then
  mkdir -p "$(dirname "$FILE")"
  cp "$ISOLATED/$FILE" "$FILE"
fi
if [[ ! -f "$ISOLATED/$FILE" && "$FILE_EXTANT" == "true" ]]; then
  rm "$FILE"
fi

# name what this apply did, apart from how the file differs from HEAD
SUM_AFTER="absent"
if [[ -f "$FILE" ]]; then
  SUM_AFTER="$(cksum < "$FILE")"
fi
OUTCOME="rewritten"
if [[ "$SUM_BEFORE" == "$SUM_AFTER" ]]; then
  OUTCOME="unchanged, already converged"
fi
if [[ "$SUM_AFTER" == "absent" && "$FILE_EXTANT" == "true" ]]; then
  OUTCOME="removed"
fi
if [[ "$SUM_AFTER" != "absent" && "$FILE_EXTANT" == "false" ]]; then
  OUTCOME="written"
fi
if [[ "$SUM_AFTER" == "absent" && "$FILE_EXTANT" == "false" ]]; then
  OUTCOME="absent before and after, no fix wrote it"
fi

# read the diff vs HEAD before the close prints, so a failed diff never leaves a half tree
SHORTSTAT="$(git --no-pager diff --shortstat -- "$FILE")" || fail_malfunction "diff"
SHORTSTAT="${SHORTSTAT# }"
# a file HEAD never held shows no diff to git; name it as new, not as a match
if [[ -z "$SHORTSTAT" ]] && ! git cat-file -e "HEAD:$FILE" 2>/dev/null; then
  SHORTSTAT="no diff, absent at HEAD too"
  if [[ -f "$FILE" ]]; then
    SHORTSTAT="new file, absent from HEAD"
  fi
fi

echo ""
echo "🐢 righteous! applied"
echo "   ├─ $FILE: $OUTCOME"
echo "   └─ vs HEAD: ${SHORTSTAT:-no diff}"
