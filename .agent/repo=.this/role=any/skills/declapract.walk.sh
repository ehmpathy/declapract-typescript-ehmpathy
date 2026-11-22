#!/usr/bin/env bash
######################################################################
# .what = walk the adopter path for one usecase, by hand: a bare
#         consumer repo runs `declapract plan`, `apply`, pins each dep
#         floor as an install would, `apply` again, `plan` again, then
#         installs and compiles what the apply emitted
#
# .why  = the integration suites drive `executeApply` from jest; a
#         verification stone also owes the path a HUMAN runs, through the
#         real cli, against the compiled `dist/` an adopter installs.
#         `npx declapract plan|apply` is not a paved call on its own, and
#         the bare repo must live outside this repo's tree, so its install
#         and compile see only the deps the usecase emits
#
# usage:
#   rhx declapract.walk --usecase lambda-service-with-rds
#   rhx declapract.walk --usecase npm-package --compile skip
#
# options:
#   --usecase   a usecase key from src/useCases.yml (required)
#   --compile   run | skip — install the emitted deps + `tsc --noEmit` (default: run)
#   --build     run | skip — rebuild dist/ first (default: run); skip reads the extant
#               dist/, for a caller that just built it or runs from it (a test)
#
# guarantee:
#   - rebuilds dist/ first, so the walk reads the declarations as shipped
#     (with --build skip, it refuses where dist/ is absent)
#   - the consumer repo is a fresh `mktemp -d` dir, never inside this repo
#   - each step's full output is kept in .log/declapract.walk/<usecase>/
#   - the consumer repo's path is kept in .log/declapract.walk/<usecase>/repo.path
#   - the treestruct shows each step's exit code and its last lines
#   - it halts at the first gated step that fails, so no later step reads
#     a broken state; the halt names the step and its log
#   - each plan splits its flags: `to author` (FIX_MANUAL, a file a
#     human writes) vs `to fix` (FIX_AUTOMATIC, a file an apply rewrites);
#     on the final plan, a `to fix` count above 0 means the apply did not
#     converge, a defect, and the walk halts on it. files to author are
#     named on each plan, and the close counts those left; they never fail
#     the walk, since a manual fix is the adopter's work
#   - a plan that fails prints its exit and last lines, never a count
#   - with --compile run, it names the tsc version the compile ran
#   - with --compile run, it also runs the emitted `test:lint:cycles`
#     and, where pg-pool is installed, reports whether its
#     `require('pg')` fallback is gone. both report, never gate
#     (a bare repo still holds cycles in floor-version packages)
#   - exit 0 = every gated step exited 0, the final plan holds no automatic
#     fix, and tsc passed; 1 = a step failed or the apply did not
#     converge (named); 2 = bad input
######################################################################
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

# reject a flag that arrives with no value, before `shift 2` fails silent under set -e
# usage: require_value <flag> <value>
require_value() {
  if [[ -z "${2:-}" || "${2:-}" == --* ]]; then
    echo "✋ ConstraintError: $1 needs a value (see --help)" >&2
    exit 2
  fi
}

# parse args
USECASE=""
COMPILE="run"
BUILD="run"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --usecase) require_value "$1" "${2:-}"; USECASE="$2"; shift 2 ;;
    --compile) require_value "$1" "${2:-}"; COMPILE="$2"; shift 2 ;;
    --build) require_value "$1" "${2:-}"; BUILD="$2"; shift 2 ;;
    --help|-h) awk 'NR > 2 && /^#####/ { exit } NR > 2' "${BASH_SOURCE[0]}"; exit 0 ;;
    --skill|--repo|--role) shift 2 ;; # rhx forwards its own selectors; not ours to read
    *) echo "✋ ConstraintError: unknown arg '$1' (see --help)" >&2; exit 2 ;;
  esac
done

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

# print the usecase keys src/useCases.yml declares, as a tree under a refusal
print_declared_usecases() {
  echo "   └─ declared usecases" >&2
  local declared; declared="$(grep -E '^  [a-z0-9-]+:$' src/useCases.yml | sed -E 's#^  ([a-z0-9-]+):$#\1#')"
  local last; last="$(printf '%s\n' "$declared" | tail -n 1)"
  local key
  while read -r key; do
    if [[ "$key" == "$last" ]]; then echo "      └─ ${key}" >&2; else echo "      ├─ ${key}" >&2; fi
  done <<< "$declared"
}

# validate args
if [[ -z "$USECASE" ]]; then
  echo "✋ ConstraintError: --usecase is required (a key from src/useCases.yml)" >&2
  print_declared_usecases
  exit 2
fi
if ! grep -qE "^  ${USECASE}:\$" src/useCases.yml; then
  echo "✋ ConstraintError: usecase '${USECASE}' is not declared in src/useCases.yml" >&2
  print_declared_usecases
  exit 2
fi
if [[ "$COMPILE" != "run" && "$COMPILE" != "skip" ]]; then
  echo "✋ ConstraintError: --compile must be run or skip, got '${COMPILE}'" >&2
  echo "   └─ e.g. --compile skip" >&2
  exit 2
fi
if [[ "$BUILD" != "run" && "$BUILD" != "skip" ]]; then
  echo "✋ ConstraintError: --build must be run or skip, got '${BUILD}'" >&2
  echo "   └─ e.g. --build skip" >&2
  exit 2
fi
if [[ "$BUILD" == "skip" && ! -f "$ROOT/dist/useCases.yml" ]]; then
  echo "✋ ConstraintError: --build skip needs a built dist/, and dist/useCases.yml is absent" >&2
  echo "   └─ fix: drop --build skip, or run npm run build first" >&2
  exit 2
fi

# prepare the log dir and the bare consumer repo
LOG_DIR="$ROOT/.log/declapract.walk/$USECASE"
rm -rf "$LOG_DIR"
mkdir -p "$LOG_DIR"
REPO_DIR="$(mktemp -d -t "declapract-walk-${USECASE}-XXXXXX")"
echo "$REPO_DIR" > "$LOG_DIR/repo.path" # so a later skill (e.g. typescript.probe) can reach the walked consumer
DECLARE_REL="$(realpath --relative-to="$REPO_DIR" "$ROOT/declapract.declare.yml")"

# the dep sections are declared empty, as in every real package.json: with a section absent, the
# engine writes a whole declared block, `ifInstalled()` floors included, as literal tokens
cat > "$REPO_DIR/package.json" <<'JSON'
{
  "name": "walk-demo",
  "version": "1.0.0",
  "private": true,
  "dependencies": {},
  "devDependencies": {}
}
JSON
cat > "$REPO_DIR/declapract.use.yml" <<YML
declarations: '${DECLARE_REL}'
useCase: ${USECASE}
variables:
  projectName: walk-demo
  organizationName: test-org
  infrastructureNamespaceId: testns
  databaseName: testdb
  databaseUserName:
    cicdUser: testdb_cicd
    serviceUser: testdb_service
  databaseTunnelHost:
    prep: tunnel.prep.test.dev
    prod: tunnel.prod.test.dev
  databaseClusterHost:
    prep: cluster.prep.test.dev
    prod: cluster.prod.test.dev
  slackWebhookUrl: 'https://hooks.slack.test/webhook'
  awsAccountId:
    prep: '111111111111'
    prod: '222222222222'
  app:
    web:
      domain:
        prep: demo.prep.test.dev
        prod: demo.test.dev
      port:
        hot: 3547
        cold: 3549
YML
git -C "$REPO_DIR" init --quiet

# run one step; keep its full output; record its exit code
STEP_FAILED=""
run_step() {
  local name="$1"; shift
  local status=0
  ( cd "$REPO_DIR" && "$@" ) > "$LOG_DIR/$name.log" 2>&1 || status=$?
  echo "$status" > "$LOG_DIR/$name.exit"
  if [[ "$status" -ne 0 && -z "$STEP_FAILED" ]]; then STEP_FAILED="$name"; fi
}

# print stdin's non-blank lines as child branches under a prefix: ├─ each, └─ the last
# usage: print_lines_as_branches prefix=<gutter>
print_lines_as_branches() {
  local prefix="${1#prefix=}"
  awk -v p="$prefix" 'NF { a[++n] = $0 } END { for (i = 1; i <= n; i++) printf "%s%s %s\n", p, (i == n ? "└─" : "├─"), a[i] }'
}

# print one step's branch: its exit code, then its last lines as its children
print_step() {
  local name="$1" lines="${2:-6}" note="${3:-}"
  local status; status="$(cat "$LOG_DIR/$name.exit")"
  echo "   ├─ ${name} (exit ${status}${note:+ · ${note}})"
  # strip color codes a tool emits (dpdm does), so the tree prints plain text
  tail -n "$lines" "$LOG_DIR/$name.log" | sed -E "s/\x1b\[[0-9;]*m//g; s#${REPO_DIR}#<repo>#g" \
    | print_lines_as_branches prefix='   │  '
  echo "   │"
}

# halt the walk at the first failed gated step, so no later step reads a broken state
halt_if_failed() {
  if [[ -z "$STEP_FAILED" ]]; then return 0; fi
  echo "   └─ 💥 MalfunctionError: step ${STEP_FAILED} failed; read .log/declapract.walk/${USECASE}/${STEP_FAILED}.log"
  echo ""
  echo "🐢 bummer dude..."
  exit 1
}

echo "🐢 lets ride..."
echo ""
echo "🐚 declapract.walk --usecase ${USECASE} --compile ${COMPILE} --build ${BUILD}"
echo "   ├─ repo: <repo> (a fresh dir outside this repo)"
echo "   ├─ logs: .log/declapract.walk/${USECASE}/"
echo "   │"

# rebuild dist, so the walk reads the declarations as an adopter receives them
if [[ "$BUILD" == "run" ]]; then
  run_step 0.build npm --prefix "$ROOT" run build
  print_step 0.build 2
  halt_if_failed
fi
if [[ "$BUILD" == "skip" ]]; then
  echo "   ├─ 0.build (skipped · --build skip reads the extant dist/)"
  echo "   │"
fi

# list the paths a plan flags with one fix kind (AUTOMATIC | MANUAL), one per line
get_flagged() {
  local name="$1" kind="$2"
  grep -E "^\s+\* \[FIX_${kind}\]" "$LOG_DIR/$name.log" | sed -E "s/^\s+\* \[FIX_${kind}\] //" || true
}

# print one plan's flags as two counts: files a human authors, each named, and fixes an apply
# rewrites, named on the final plan alone (on the first, they are the apply's own work).
# a plan that failed holds no true count, so it prints as a plain step: its exit and last lines
NOT_CONVERGED=""
AUTHOR_LEFT="0"
print_flagged() {
  local name="$1" stage="$2"
  local status; status="$(cat "$LOG_DIR/$name.exit")"
  if [[ "$status" -ne 0 ]]; then print_step "$name" 8; return 0; fi
  local manual; manual="$(get_flagged "$name" MANUAL)"
  local automatic; automatic="$(get_flagged "$name" AUTOMATIC)"
  local count_manual; count_manual="$(printf '%s' "$manual" | grep -c . || true)"
  local count_automatic; count_automatic="$(printf '%s' "$automatic" | grep -c . || true)"
  echo "   ├─ ${name} (exit ${status})"
  echo "   │  ├─ to author: $(as_count count="$count_manual" one='file' many='files') a human writes (FIX_MANUAL)"
  printf '%s\n' "$manual" | print_lines_as_branches prefix='   │  │  '
  echo "   │  └─ to fix: $(as_count count="$count_automatic" one='file' many='files') an apply rewrites (FIX_AUTOMATIC)"
  if [[ "$stage" == "final" ]]; then printf '%s\n' "$automatic" | print_lines_as_branches prefix='   │     '; fi
  echo "   │"
  if [[ "$stage" == "final" && "$count_automatic" -gt 0 ]]; then NOT_CONVERGED="$count_automatic"; fi
  if [[ "$stage" == "final" ]]; then AUTHOR_LEFT="$count_manual"; fi
  return 0
}

# the adopter path: plan, apply
run_step 1.plan "$ROOT/node_modules/.bin/declapract" plan
print_flagged 1.plan first
halt_if_failed
run_step 2.apply "$ROOT/node_modules/.bin/declapract" apply
print_step 2.apply 8
halt_if_failed
cp "$REPO_DIR/package.json" "$LOG_DIR/package.applied.json"

# a bare repo holds no deps, so the apply writes each floor as its literal check; an adopter's
# repo holds real versions. pin each floor as its version, as an adopter's install would
sed -i -E "s/@declapract\\{check\\.minVersion\\('([^']+)'\\)(\\.ifInstalled\\(\\))?\\}/\\1/g" "$REPO_DIR/package.json"
cp "$REPO_DIR/package.json" "$LOG_DIR/package.pinned.json"

# a second apply, then the plan that must show only what a human must author
run_step 3.apply.again "$ROOT/node_modules/.bin/declapract" apply
print_step 3.apply.again 4
halt_if_failed
run_step 4.plan.final "$ROOT/node_modules/.bin/declapract" plan
print_flagged 4.plan.final final
halt_if_failed

# halt if the second apply left an automatic fix behind: the usecase does not converge
if [[ -n "$NOT_CONVERGED" ]]; then
  echo "   └─ 💥 MalfunctionError: the apply did not converge: $(as_count count="$NOT_CONVERGED" one='file' many='files') an apply still rewrites; read .log/declapract.walk/${USECASE}/4.plan.final.log"
  echo ""
  echo "🐢 bummer dude..."
  exit 1
fi

# install the emitted deps, then compile
if [[ "$COMPILE" == "run" ]]; then
  run_step 5.install pnpm install --no-frozen-lockfile --ignore-scripts --prefer-offline
  print_step 5.install 3
  halt_if_failed
  # name the tsc the compile ran, since the emitted floor decides it
  TSC_VERSION="$(cd "$REPO_DIR" && pnpm exec tsc --version 2>/dev/null | tail -n 1 || true)"
  echo "   ├─ tsc: ${TSC_VERSION:-absent}"
  echo "   │"
  run_step 6.compile pnpm exec tsc --noEmit --pretty false -p tsconfig.json
  print_step 6.compile 8
  halt_if_failed

  # run the emitted cycle check, as the adopter's `npm run test:lint` does. report-only: in a bare
  # repo it still exits 1 on cycles inside floor-version packages, so it does not gate the walk
  run_step 7.cycles pnpm run test:lint:cycles
  STEP_FAILED=""
  print_step 7.cycles 12 "report only, never gates"

  # report whether the installed pg-pool still holds the `require('pg')` fallback a shipped patch drops
  # an install with no .pnpm store (no deps emitted) holds no pg-pool, so the report is skipped, never failed
  PG_POOL_INDEX=""
  if [[ -d "$REPO_DIR/node_modules/.pnpm" ]]; then
    PG_POOL_INDEX="$(find "$REPO_DIR/node_modules/.pnpm" -maxdepth 4 -path '*/node_modules/pg-pool/index.js' | head -n 1)"
  fi
  if [[ -n "$PG_POOL_INDEX" ]]; then
    PG_POOL_ENTRY="$(basename "$(dirname "$(dirname "$(dirname "$PG_POOL_INDEX")")")" | sed -E 's/_patch_hash=[^_]+/_patch_hash=<hash>/')"
    PG_POOL_REQUIRES="$(grep -c "require('pg')" "$PG_POOL_INDEX" || true)"
    echo "   ├─ pg-pool (report)"
    echo "   │  ├─ install: ${PG_POOL_ENTRY}"
    echo "   │  └─ require('pg') left in index.js: ${PG_POOL_REQUIRES}"
    echo "   │"
  fi
fi

# a file left to author is the adopter's work, not a defect, so the walk passes and names it
AUTHOR_NOTE=""
if [[ "$AUTHOR_LEFT" -gt 0 ]]; then AUTHOR_NOTE="; $(as_count count="$AUTHOR_LEFT" one='file' many='files') left for a human to author"; fi
echo "   └─ ✨ every gated step exited 0, and the apply converged${AUTHOR_NOTE}"
echo ""
echo "🐢 righteous!"
