#!/usr/bin/env bash
######################################################################
# .what = measure the typescript compiler across version rungs, read
#         the same way on each: typecheck wall, cpu, peak rss. or, diff
#         the dist/ each rung emits and grep it for unrewritten aliases
#
# .why  = a compiler upgrade owes a measured answer: one command, one
#         tsconfig, cold runs, a spread beside each median. a second
#         compiler install, a timed loop, and a dist diff are not paved
#         calls alone, and the next probe should rerun this, not
#         rediscover it
#
# usage:
#   rhx typescript.probe --what typecheck
#   rhx typescript.probe --what typecheck --runs 5 --rungs '5.4.5 6.0.3 7.0.2 7.0.2:single'
#   rhx typescript.probe --what emit --walk lambda-service
#
# options:
#   --what      typecheck | emit (required)
#   --dir       the repo dir to probe (default: this repo). named --dir, since rhx owns --repo
#   --walk      a usecase `rhx declapract.walk` already walked; probes that consumer (in place of --dir)
#   --rungs     typescript versions, space-separated; a `:single` suffix adds --singleThreaded
#               (default typecheck: '5.4.5 6.0.3 7.0.2 7.0.2:single'; emit: '5.4.5 7.0.2')
#   --runs      cold runs per rung, after one discarded warm-up (default: 5)
#   --tsconfig  the tsconfig to read (default typecheck: tsconfig.json; emit: tsconfig.build.json)
#   --label     a tag for the log dir, to keep two probes apart (default: none)
#
# guarantee:
#   - each typescript version installs once into ~/.cache/typescript.probe/<version>/, never the repo;
#     the install lands in a temp dir first and moves into place whole
#   - one probe at a time per machine: a second one exits 2, since shared cores skew both timings
#   - never writes into the probed repo: typecheck passes --noEmit --incremental false, and emit
#     sends tsc and tsc-alias to an --outDir under this repo's .temp/; the warm-up run is discarded, so every
#     reported run is cold
#   - typecheck: median + min–max per rung for wall, cpu (user + sys), and peak rss; a rung whose
#     wall range overlaps the first rung's reads "within noise", never a ratio
#   - typecheck: a rung where any run exits non-zero reports that exit, with the first error
#     lines of the first run that failed, and no speed verdict (a stopped check times naught)
#   - typecheck: each rung reports how many files it reads (`--listFilesOnly`), so a fast rung
#     is proven to check the same scope
#   - emit: builds each rung's tree with tsc + the repo's own tsc-alias, diffs the first rung's
#     tree against the last's, and greps the last for unrewritten `@src/` and `@/` specifiers
#   - each --rungs value must read <version> or <version>:single, version in [0-9A-Za-z.-];
#     --label and --walk must be a bare slug in [0-9A-Za-z._-]
#   - each typecheck rung names the `tsc --version` it ran, so a rung like `latest` names its subject
#   - names the machine: cpu model and core count
#   - every run's full output lands in .log/typescript.probe/<what>[.<label>]/
#   - every rung installs before the first timed run; a version the registry does not hold exits 2
#   - exit 0 = every rung ran clean; 1 = a tsc exited non-zero, or emit found an unrewritten
#     specifier; 2 = bad input
######################################################################
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"

# reject a flag that arrives with no value, before `shift 2` fails silent under set -e
# usage: require_value <flag> <value>
require_value() {
  if [[ -z "${2:-}" || "${2:-}" == --* ]]; then
    echo "✋ ConstraintError: $1 needs a value (see --help)" >&2
    exit 2
  fi
}

# parse args
WHAT=""
REPO="$ROOT"
RUNGS=""
RUNS="5"
TSCONFIG=""
LABEL=""
WALK=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --what) require_value "$1" "${2:-}"; WHAT="$2"; shift 2 ;;
    --dir) require_value "$1" "${2:-}"; REPO="$2"; shift 2 ;;
    --walk) require_value "$1" "${2:-}"; WALK="$2"; shift 2 ;;
    --rungs) require_value "$1" "${2:-}"; RUNGS="$2"; shift 2 ;;
    --runs) require_value "$1" "${2:-}"; RUNS="$2"; shift 2 ;;
    --tsconfig) require_value "$1" "${2:-}"; TSCONFIG="$2"; shift 2 ;;
    --label) require_value "$1" "${2:-}"; LABEL="$2"; shift 2 ;;
    --help|-h) awk 'NR > 2 && /^#####/ { exit } NR > 2' "${BASH_SOURCE[0]}"; exit 0 ;; # the header, up to its last rule line
    --skill|--repo|--role) shift 2 ;; # rhx forwards its own selectors; not ours to read
    *) echo "✋ ConstraintError: unknown arg '$1' (see --help)" >&2; exit 2 ;;
  esac
done

# validate args
if [[ "$WHAT" != "typecheck" && "$WHAT" != "emit" ]]; then
  echo "✋ ConstraintError: --what must be typecheck or emit, got '${WHAT}'" >&2
  echo "   └─ e.g. rhx typescript.probe --what typecheck" >&2
  exit 2
fi
# --label and --walk each name a dir this probe clears or reads, so each must be a bare slug
# usage: require_slug <flag> <value>
require_slug() {
  if [[ -n "$2" && ! "$2" =~ ^[0-9A-Za-z._-]+$ ]] || [[ "$2" == *..* ]]; then
    echo "✋ ConstraintError: $1 must be a bare slug in [0-9A-Za-z._-], got '$2'" >&2
    echo "   └─ e.g. $1 npm-package" >&2
    exit 2
  fi
}
require_slug --label "$LABEL"
require_slug --walk "$WALK"
if [[ -n "$WALK" ]]; then
  WALK_PATH_FILE="$ROOT/.log/declapract.walk/${WALK}/repo.path"
  if [[ ! -f "$WALK_PATH_FILE" ]]; then
    echo "✋ ConstraintError: no walked consumer for usecase '${WALK}'" >&2
    echo "   └─ fix: rhx declapract.walk --usecase ${WALK}" >&2
    exit 2
  fi
  REPO="$(cat "$WALK_PATH_FILE")"
fi
if [[ ! -d "$REPO" && -n "$WALK" ]]; then
  echo "✋ ConstraintError: --walk ${WALK} names a consumer dir that is gone: ${REPO}" >&2
  echo "   └─ fix: rerun rhx declapract.walk --usecase ${WALK}" >&2
  exit 2
fi
if [[ ! -d "$REPO" ]]; then
  echo "✋ ConstraintError: --dir '${REPO}' is not a dir" >&2
  exit 2
fi
if ! [[ "$RUNS" =~ ^[1-9][0-9]*$ ]]; then
  echo "✋ ConstraintError: --runs must be a positive integer, got '${RUNS}'" >&2
  echo "   └─ e.g. --runs 5" >&2
  exit 2
fi
REPO="$(realpath "$REPO")"
if [[ -z "$RUNGS" && "$WHAT" == "typecheck" ]]; then RUNGS="5.4.5 6.0.3 7.0.2 7.0.2:single"; fi
if [[ -z "$RUNGS" && "$WHAT" == "emit" ]]; then RUNGS="5.4.5 7.0.2"; fi
for RUNG in $RUNGS; do
  # each rung names a cache dir and an install spec, so it must be a bare version
  if ! [[ "$RUNG" =~ ^[0-9A-Za-z.-]+(:single)?$ ]]; then
    echo "✋ ConstraintError: --rungs value '${RUNG}' is not <version> or <version>:single" >&2
    echo "   └─ e.g. --rungs '5.4.5 7.0.2 7.0.2:single'" >&2
    exit 2
  fi
done
if [[ -z "$TSCONFIG" && "$WHAT" == "typecheck" ]]; then TSCONFIG="tsconfig.json"; fi
if [[ -z "$TSCONFIG" && "$WHAT" == "emit" ]]; then TSCONFIG="tsconfig.build.json"; fi
if [[ ! -f "$REPO/$TSCONFIG" ]]; then
  echo "✋ ConstraintError: no ${TSCONFIG} in ${REPO}" >&2
  echo "   └─ fix: name the file via --tsconfig, or point --dir at the repo that holds it" >&2
  exit 2
fi
if [[ ! -x /usr/bin/time ]]; then
  echo "✋ ConstraintError: /usr/bin/time is absent; it reads wall, cpu, and rss per run" >&2
  echo "   └─ fix: install gnu time (e.g. apt-get install time)" >&2
  exit 2
fi

# hold the one probe lock on this machine: a second probe would share the cores and skew both
# measurements, and would race this one on the install cache and the log dir
CACHE_DIR="$HOME/.cache/typescript.probe"
mkdir -p "$CACHE_DIR"
LOCK_DIR="$CACHE_DIR/.lock"
if ! mkdir "$LOCK_DIR" 2> /dev/null; then
  echo "✋ ConstraintError: another typescript.probe holds the lock; two at once skew each other's timings" >&2
  echo "   └─ fix: wait for it to finish; if no other probe is live (a crash left the lock), rm -r ${LOCK_DIR}" >&2
  exit 2
fi
trap 'rm -rf "$LOCK_DIR"' EXIT

# prepare the log dir
LOG_DIR="$ROOT/.log/typescript.probe/${WHAT}${LABEL:+.$LABEL}"
rm -rf "$LOG_DIR"
mkdir -p "$LOG_DIR"

# print stdin's non-blank lines as child branches under a prefix: ├─ each, └─ the last
# usage: print_lines_as_branches prefix=<gutter>
print_lines_as_branches() {
  local prefix="${1#prefix=}"
  awk -v p="$prefix" 'NF { a[++n] = $0 } END { for (i = 1; i <= n; i++) printf "%s%s %s\n", p, (i == n ? "└─" : "├─"), a[i] }'
}

# install one typescript version into the cache, once; echo its tsc path
# usage: get_tsc version=<semver>
get_tsc() {
  local version=""
  local arg
  for arg in "$@"; do
    case "$arg" in
      version=*) version="${arg#version=}" ;;
    esac
  done
  local dir="$CACHE_DIR/$version"
  if [[ ! -x "$dir/node_modules/.bin/tsc" ]]; then
    # install into a temp dir, then move it into place whole, so a reader never sees half an install
    local stage
    stage="$(mktemp -d "$CACHE_DIR/.stage.${version}.XXXXXX")"
    echo '{ "name": "typescript-probe-rung", "private": true }' > "$stage/package.json"

    # pnpm where present (an `npm` shim may forward to it and reject npm-only flags); npm otherwise
    local installer="npm install"
    if command -v pnpm > /dev/null; then installer="pnpm add"; fi
    local log="$LOG_DIR/install.${version}.log"
    if ! ( cd "$stage" && $installer "typescript@${version}" ) > "$log" 2>&1; then
      rm -rf "$stage"

      # a version the registry does not hold is the caller's to fix; any other failure is the system's
      if grep -qE 'NO_MATCHING_VERSION|ETARGET|No matching version' "$log"; then
        echo "✋ ConstraintError: --rungs names typescript@${version}, which the registry does not hold" >&2
        echo "   ├─ log: ${log#"$ROOT"/}" >&2
        echo "   └─ fix: pick a published version; list them via \`npm view typescript versions\`" >&2
        return 2
      fi
      echo "💥 MalfunctionError: '${installer} typescript@${version}' failed" >&2
      echo "   ├─ log: ${log#"$ROOT"/}" >&2
      echo "   └─ last lines" >&2
      tail -n 5 "$log" | print_lines_as_branches prefix='      ' >&2
      return 1
    fi
    rm -rf "$dir"
    mv "$stage" "$dir"
  fi
  echo "$dir/node_modules/.bin/tsc"
}

# a count with its noun, singular for one: `1 file`, `2 files`
# usage: as_count count=<n> one=<noun> many=<nouns>
as_count() {
  local count="" one="" many=""
  local arg
  for arg in "$@"; do
    case "$arg" in
      count=*) count="${arg#count=}" ;;
      one=*) one="${arg#one=}" ;;
      many=*) many="${arg#many=}" ;;
    esac
  done
  if [[ "$count" == "1" ]]; then echo "${count} ${one}"; else echo "${count} ${many}"; fi
}

# the median, min, and max of a column of numbers, as "median min max"
get_stats() {
  sort -g | awk '{ v[NR] = $1 } END { m = (NR % 2) ? v[(NR + 1) / 2] : (v[NR / 2] + v[NR / 2 + 1]) / 2; printf "%s %s %s", m, v[1], v[NR] }'
}

# the machine the numbers belong to
CPU_MODEL="$({ grep -m1 'model name' /proc/cpuinfo 2> /dev/null || echo 'model name : unknown cpu'; } | sed -E 's/^model name\s*:\s*//')"
CPU_CORES="$(getconf _NPROCESSORS_ONLN 2> /dev/null || echo '?')"

# an emit needs the repo's own tsc-alias; check before the report opens, as with any input
TSC_ALIAS="$REPO/node_modules/.bin/tsc-alias"
if [[ "$WHAT" == "emit" && ! -x "$TSC_ALIAS" ]]; then
  echo "✋ ConstraintError: no tsc-alias in ${REPO}/node_modules/.bin; install the repo's deps first" >&2
  exit 2
fi

# emit builds each rung once, so it reads no --runs
RUNS_SHOWN=""
if [[ "$WHAT" == "typecheck" ]]; then RUNS_SHOWN=" --runs ${RUNS}"; fi

echo "🐢 lets ride..."
echo ""
echo "🐚 typescript.probe --what ${WHAT}${RUNS_SHOWN} --rungs '${RUNGS}'"
echo "   ├─ repo: ${REPO/#$ROOT/.}"
echo "   ├─ tsconfig: ${TSCONFIG}"
echo "   ├─ machine: ${CPU_MODEL} · ${CPU_CORES} cores"
echo "   ├─ logs: ${LOG_DIR#"$ROOT"/}/"
echo "   │"

# install every rung before the first timed run, so a bad version fails at once, with no rung timed in vain;
# a failed install closes the report, and its error, with the fix, is on stderr
for RUNG in $RUNGS; do
  INSTALL_STATUS=0
  get_tsc version="${RUNG%%:*}" > /dev/null || INSTALL_STATUS=$?
  if [[ "$INSTALL_STATUS" -ne 0 ]]; then
    GLYPH="💥"
    CLASS="MalfunctionError"
    if [[ "$INSTALL_STATUS" -eq 2 ]]; then GLYPH="✋"; CLASS="ConstraintError"; fi
    echo "   └─ ${GLYPH} ${CLASS}: typescript@${RUNG%%:*} could not install; the error and its fix are on stderr"
    echo ""
    echo "🐢 bummer dude..."
    exit "$INSTALL_STATUS"
  fi
done

# the count of rungs, so the tree closes on the last with └─
# word-split on purpose: --rungs is a space-separated list
# shellcheck disable=SC2086
RUNG_COUNT="$(printf '%s\n' $RUNGS | grep -c .)"

FAILED=""
FILES_UNREAD=0

######################################################################
# typecheck: cold, timed runs per rung
######################################################################
if [[ "$WHAT" == "typecheck" ]]; then
  BASE_MIN=""
  BASE_MAX=""
  BASE_MED=""
  echo "   ├─ rungs (median [min–max] over $(as_count count="$RUNS" one='cold run' many='cold runs'))"
  RUNG_INDEX=0
  for RUNG in $RUNGS; do
    RUNG_INDEX=$((RUNG_INDEX + 1))
    # the branch glyph for this rung, and the gutter its children sit behind
    BRANCH="├─"
    GUTTER="│  "
    if [[ "$RUNG_INDEX" -eq "$RUNG_COUNT" ]]; then BRANCH="└─"; GUTTER="   "; fi
    VERSION="${RUNG%%:*}"
    FLAGS=""
    if [[ "$RUNG" == *":single" ]]; then FLAGS="--singleThreaded"; fi
    TSC="$(get_tsc version="$VERSION")"
    TAG="${RUNG//:/.}"

    # one warm-up, discarded; then the cold runs. the first run that fails marks the rung
    STATUS=0
    FAILED_RUN=""
    for i in $(seq 0 "$RUNS"); do
      RUN_STATUS=0
      ( cd "$REPO" && /usr/bin/time -f '%e %U %S %M' -o "$LOG_DIR/$TAG.time.$i" \
          "$TSC" -p "$TSCONFIG" --noEmit --incremental false --pretty false $FLAGS ) \
        > "$LOG_DIR/$TAG.out.$i" 2>&1 || RUN_STATUS=$?
      if [[ "$RUN_STATUS" -ne 0 && -z "$FAILED_RUN" ]]; then STATUS="$RUN_STATUS"; FAILED_RUN="$i"; fi
    done

    # count the files the rung reads, so a fast rung is proven to read the same scope
    FILES="n/a"
    FILES_NOTE=""
    if ( cd "$REPO" && "$TSC" -p "$TSCONFIG" --listFilesOnly --noEmit --incremental false ) > "$LOG_DIR/$TAG.files" 2>&1; then
      FILES="$(grep -c . "$LOG_DIR/$TAG.files" || true)"
    fi
    # an unread count drops the proof that this rung read the same scope, so the report says why, and the close counts it
    if [[ "$FILES" == "n/a" ]]; then
      FILES_NOTE=" (--listFilesOnly failed; read ${LOG_DIR#"$ROOT"/}/${TAG}.files)"
      FILES_UNREAD=$((FILES_UNREAD + 1))
    fi

    # read the cold runs (1..RUNS); gnu time prepends a line when the command exits non-zero
    WALL="$(for i in $(seq 1 "$RUNS"); do tail -n1 "$LOG_DIR/$TAG.time.$i" | awk '{ print $1 }'; done | get_stats)"
    CPU="$(for i in $(seq 1 "$RUNS"); do tail -n1 "$LOG_DIR/$TAG.time.$i" | awk '{ print $2 + $3 }'; done | get_stats)"
    RSS="$(for i in $(seq 1 "$RUNS"); do tail -n1 "$LOG_DIR/$TAG.time.$i" | awk '{ printf "%.0f\n", $4 / 1024 }'; done | get_stats)"
    read -r WALL_MED WALL_MIN WALL_MAX <<< "$WALL"
    read -r CPU_MED CPU_MIN CPU_MAX <<< "$CPU"
    read -r RSS_MED RSS_MIN RSS_MAX <<< "$RSS"

    # a failed rung's wall times a typecheck that stopped at an error, so it claims no speed and
    # anchors none: the baseline is the first rung that ran clean, and each later clean rung reads
    # against it, a ratio only where the wall ranges do not overlap
    VERDICT="not compared, since the rung failed"
    if [[ "$STATUS" -eq 0 && -n "$BASE_MED" ]]; then
      VERDICT="$(awk -v bmin="$BASE_MIN" -v bmax="$BASE_MAX" -v bmed="$BASE_MED" -v min="$WALL_MIN" -v max="$WALL_MAX" -v med="$WALL_MED" \
        'BEGIN { if (min <= bmax && max >= bmin) print "within noise"; else printf "%.1fx %s than baseline", (med < bmed ? bmed / med : med / bmed), (med < bmed ? "faster" : "slower") }')"
    fi
    if [[ "$STATUS" -eq 0 && -z "$BASE_MED" ]]; then
      BASE_MED="$WALL_MED"; BASE_MIN="$WALL_MIN"; BASE_MAX="$WALL_MAX"
      VERDICT="baseline"
    fi

    # name the failed run as a human counts: the discarded warm-up, or cold run 1..RUNS
    RUN_LABEL="cold run ${FAILED_RUN}"
    if [[ "$FAILED_RUN" == "0" ]]; then RUN_LABEL="the warm-up run"; fi

    TSC_VERSION="$("$TSC" --version 2> /dev/null || echo 'version unknown')"
    echo "   │  ${BRANCH} typescript@${RUNG} (exit ${STATUS}) · $(as_count count="$FILES" one='file read' many='files read')${FILES_NOTE} · ${TSC_VERSION}"
    echo "   │  ${GUTTER}├─ wall: ${WALL_MED}s [${WALL_MIN}–${WALL_MAX}] · ${VERDICT}"
    echo "   │  ${GUTTER}├─ cpu:  ${CPU_MED}s [${CPU_MIN}–${CPU_MAX}]"
    if [[ "$STATUS" -ne 0 ]]; then
      echo "   │  ${GUTTER}├─ rss:  ${RSS_MED}MB [${RSS_MIN}–${RSS_MAX}]"
      echo "   │  ${GUTTER}└─ errors (first 8 lines of ${RUN_LABEL}, the first that failed)"
      head -n 8 "$LOG_DIR/$TAG.out.$FAILED_RUN" | sed -E "s#${REPO}#<repo>#g" | print_lines_as_branches prefix="   │  ${GUTTER}   "
      if [[ -z "$FAILED" ]]; then FAILED="typescript@${RUNG} exited ${STATUS}"; fi
    else
      echo "   │  ${GUTTER}└─ rss:  ${RSS_MED}MB [${RSS_MIN}–${RSS_MAX}]"
    fi
    if [[ "$RUNG_INDEX" -lt "$RUNG_COUNT" ]]; then echo "   │  │"; fi
  done
  echo "   │"
fi

######################################################################
# emit: build dist/ per rung, diff the trees, grep for unrewritten aliases
######################################################################
if [[ "$WHAT" == "emit" ]]; then
  # trees land in this repo's gitignored .temp/, never /tmp, which no job cleans
  mkdir -p "$ROOT/.temp"
  OUT_DIR="$(mktemp -d "$ROOT/.temp/typescript-probe-emit-XXXXXX")"
  FIRST=""
  LAST=""
  echo "   ├─ builds"
  RUNG_INDEX=0
  for RUNG in $RUNGS; do
    RUNG_INDEX=$((RUNG_INDEX + 1))
    # the branch glyph for this rung, and the gutter its children sit behind
    BRANCH="├─"
    GUTTER="│  "
    if [[ "$RUNG_INDEX" -eq "$RUNG_COUNT" ]]; then BRANCH="└─"; GUTTER="   "; fi
    VERSION="${RUNG%%:*}"
    TSC="$(get_tsc version="$VERSION")"
    STATUS=0
    mkdir -p "$OUT_DIR/$VERSION"
    # emit into the probe's own dir, so the probed repo's dist/ is never touched
    ( cd "$REPO" \
        && "$TSC" -p "$TSCONFIG" --pretty false --incremental false --outDir "$OUT_DIR/$VERSION" \
        && "$TSC_ALIAS" -p "$TSCONFIG" --outDir "$OUT_DIR/$VERSION" ) \
      > "$LOG_DIR/build.${VERSION}.log" 2>&1 || STATUS=$?
    FILES="$(find "$OUT_DIR/$VERSION" -type f | wc -l | tr -d ' ')"
    echo "   │  ${BRANCH} typescript@${VERSION} (exit ${STATUS}) · $(as_count count="$FILES" one='file emitted' many='files emitted')"
    if [[ "$STATUS" -ne 0 ]]; then
      echo "   │  ${GUTTER}└─ errors (first 8 lines of the build log)"
      head -n 8 "$LOG_DIR/build.${VERSION}.log" | sed -E "s#${REPO}#<repo>#g" | print_lines_as_branches prefix="   │  ${GUTTER}   "
      if [[ -z "$FAILED" ]]; then FAILED="build under typescript@${VERSION} exited ${STATUS}"; fi
    fi
    if [[ -z "$FIRST" ]]; then FIRST="$VERSION"; fi
    LAST="$VERSION"
  done
  echo "   │"

  # a failed build leaves a partial or empty tree, so neither the diff nor the alias grep reads true
  if [[ -n "$FAILED" ]]; then
    echo "   ├─ diff and alias seam: skipped, since a build failed"
    echo "   │"
  fi

  # diff the first rung's tree against the last's; one rung has no second tree to diff
  if [[ -z "$FAILED" && "$FIRST" == "$LAST" ]]; then
    echo "   ├─ diff: skipped, since one rung builds no second tree to compare"
    echo "   │"
  fi
  if [[ -z "$FAILED" && "$FIRST" != "$LAST" ]]; then
    DIFF_LOG="$LOG_DIR/diff.${FIRST}.vs.${LAST}.log"
    diff -r "$OUT_DIR/$FIRST" "$OUT_DIR/$LAST" > "$DIFF_LOG" 2>&1 || true
    DIFF_FILES="$(grep -cE '^(diff -r|Only in)' "$DIFF_LOG" || true)"
    echo "   ├─ diff ${FIRST} vs ${LAST}: $(as_count count="$DIFF_FILES" one='file differs' many='files differ')"
    # each line names the pair that differs, as a read: `a vs b`, never the diff command that found it
    { grep -E '^(diff -r|Only in)' "$DIFF_LOG" | head -n 20 | sed -E "s#${OUT_DIR}/##g; s#^diff -r ([^ ]+) ([^ ]+)#differs: \\1 vs \\2#" || true
      echo "full diff: ${DIFF_LOG#"$ROOT"/}"
    } | print_lines_as_branches prefix='   │  '
    echo "   │"
  fi

  # grep the last rung's tree for alias specifiers tsc-alias left behind
  # only a specifier position counts: a `require("…")`, or a statement that opens with import/export.
  # a repo that generates code holds `'@src/…'` inside its own string literals, which tsc-alias rightly skips
  if [[ -z "$FAILED" ]]; then
    grep -rnE "require\([\"'](@src|@)/|^\s*(import|export)\b.*from [\"'](@src|@)/" "$OUT_DIR/$LAST" --include='*.js' > "$LOG_DIR/alias.unrewritten.log" 2>/dev/null || true
    UNREWRITTEN="$(grep -c . "$LOG_DIR/alias.unrewritten.log" || true)"
    # name the tsc-alias that ran, so the seam line names both tools under test, clean or not
    TSC_ALIAS_VERSION="$(node -p "require('${REPO}/node_modules/tsc-alias/package.json').version" 2> /dev/null || echo '?')"
    if [[ "$UNREWRITTEN" -gt 0 ]]; then
      echo "   ├─ alias seam: $(as_count count="$UNREWRITTEN" one='unrewritten specifier' many='unrewritten specifiers') in dist/ (tsc-alias ${TSC_ALIAS_VERSION}, typescript@${LAST})"
      head -n 10 "$LOG_DIR/alias.unrewritten.log" | sed -E "s#${OUT_DIR}/${LAST}/#dist/#g; s#^#   │  ├─ #"
      echo "   │  └─ fix: an alias whose target sits outside the build rootDir (e.g. \`@/\` beside \`rootDir: src\`) is one tsc-alias cannot map; point those imports at one under it (\`@src/…\`). if \`@src/\` itself is left, tsc-alias does not yet map \`paths\` with no \`baseUrl\`: keep typescript below 7 in this repo until it does"
      echo "   │"
      FAILED="$(as_count count="$UNREWRITTEN" one='unrewritten alias specifier' many='unrewritten alias specifiers') under typescript@${LAST}"
    else
      echo "   ├─ alias seam: 0 unrewritten \`@src/\` or \`@/\` specifiers in dist/ (tsc-alias ${TSC_ALIAS_VERSION}, typescript@${LAST})"
      echo "   │"
    fi
  fi
  echo "   ├─ trees kept at: ${OUT_DIR}"
  echo "   │"
fi

# report the outcome
if [[ -n "$FAILED" ]]; then
  echo "   └─ 💥 MalfunctionError: ${FAILED}; read ${LOG_DIR#"$ROOT"/}/"
  echo ""
  echo "🐢 bummer dude..."
  exit 1
fi
# an emit diff is a read, not a fault, so the close names what passed: each build, and the alias seam
if [[ "$WHAT" == "emit" ]]; then echo "   └─ ✨ every rung built clean, and no alias specifier was left"; fi
# a clean run whose file count went unread lacks its scope proof, so the close says so
SCOPE_NOTE=""
if [[ "$FILES_UNREAD" -gt 0 ]]; then SCOPE_NOTE="; $(as_count count="$FILES_UNREAD" one='rung' many='rungs') read no file count, so its scope is unproven"; fi
if [[ "$WHAT" == "typecheck" ]]; then echo "   └─ ✨ every rung ran clean${SCOPE_NOTE}"; fi
echo ""
echo "🐢 righteous!"
