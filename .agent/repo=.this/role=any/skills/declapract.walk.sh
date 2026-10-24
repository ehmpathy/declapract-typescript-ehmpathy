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
#
# guarantee:
#   - rebuilds dist/ first, so the walk reads the declarations as shipped
#   - the consumer repo is a fresh `mktemp -d` dir, never inside this repo
#   - each step's full output is kept in .log/declapract.walk/<usecase>/
#   - the treestruct shows each step's exit code and its last lines
#   - the final plan splits its flags: `to author` (FIX_MANUAL, a file a
#     human writes) vs `not converged` (FIX_AUTOMATIC, a defect)
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

# parse args
USECASE=""
COMPILE="run"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --usecase) USECASE="${2:-}"; shift 2 ;;
    --compile) COMPILE="${2:-}"; shift 2 ;;
    --help|-h) sed -n '2,37p' "${BASH_SOURCE[0]}"; exit 0 ;;
    --skill|--repo|--role) shift 2 ;; # rhx forwards its own selectors; not ours to read
    *) echo "✋ ConstraintError: unknown arg '$1' (see --help)" >&2; exit 2 ;;
  esac
done

# validate args
if [[ -z "$USECASE" ]]; then
  echo "✋ ConstraintError: --usecase is required (a key from src/useCases.yml)" >&2
  exit 2
fi
if ! grep -qE "^  ${USECASE}:\$" src/useCases.yml; then
  echo "✋ ConstraintError: usecase '${USECASE}' is not declared in src/useCases.yml" >&2
  exit 2
fi
if [[ "$COMPILE" != "run" && "$COMPILE" != "skip" ]]; then
  echo "✋ ConstraintError: --compile must be run or skip, got '${COMPILE}'" >&2
  exit 2
fi

# prepare the log dir and the bare consumer repo
LOG_DIR="$ROOT/.log/declapract.walk/$USECASE"
rm -rf "$LOG_DIR"
mkdir -p "$LOG_DIR"
REPO_DIR="$(mktemp -d -t "declapract-walk-${USECASE}-XXXXXX")"
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

# print one step's branch: its exit code, then its last lines
print_step() {
  local name="$1" lines="${2:-6}"
  local status; status="$(cat "$LOG_DIR/$name.exit")"
  echo "   ├─ ${name} (exit ${status})"
  # strip color codes a tool emits (dpdm does), so the tree prints plain text
  tail -n "$lines" "$LOG_DIR/$name.log" | sed -E "s/\x1b\[[0-9;]*m//g; s#${REPO_DIR}#<repo>#g; s#^#   │     #"
  echo "   │"
}

echo "🐢 lets ride..."
echo ""
echo "🐚 declapract.walk --usecase ${USECASE} --compile ${COMPILE}"
echo "   ├─ repo: <repo> (a fresh dir outside this repo)"
echo "   ├─ logs: .log/declapract.walk/${USECASE}/"
echo "   │"

# rebuild dist, so the walk reads the declarations as an adopter receives them
run_step 0.build npm --prefix "$ROOT" run build
print_step 0.build 2

# list the paths a plan flags with one fix kind (AUTOMATIC | MANUAL), one per line
get_flagged() {
  local name="$1" kind="$2"
  grep -E "^\s+\* \[FIX_${kind}\]" "$LOG_DIR/$name.log" | sed -E "s/^\s+\* \[FIX_${kind}\] //" || true
}

# print one plan's flags as two counts: files a human authors, and fixes the apply left behind
NOT_CONVERGED=""
print_flagged() {
  local name="$1" verbose="${2:-list}"
  local status; status="$(cat "$LOG_DIR/$name.exit")"
  local manual; manual="$(get_flagged "$name" MANUAL)"
  local automatic; automatic="$(get_flagged "$name" AUTOMATIC)"
  local count_manual; count_manual="$(printf '%s' "$manual" | grep -c . || true)"
  local count_automatic; count_automatic="$(printf '%s' "$automatic" | grep -c . || true)"
  echo "   ├─ ${name} (exit ${status})"
  echo "   │  ├─ to author: ${count_manual} file(s) a human writes (FIX_MANUAL)"
  [[ "$verbose" == "list" && -n "$manual" ]] && printf '%s\n' "$manual" | sed 's#^#   │  │     #'
  echo "   │  └─ to fix: ${count_automatic} file(s) an apply rewrites (FIX_AUTOMATIC)"
  [[ "$verbose" == "list" && -n "$automatic" ]] && printf '%s\n' "$automatic" | sed 's#^#   │        #'
  echo "   │"
  if [[ "$verbose" == "list" && "$count_automatic" -gt 0 ]]; then NOT_CONVERGED="$count_automatic"; fi
  return 0
}

# the adopter path: plan, apply
run_step 1.plan "$ROOT/node_modules/.bin/declapract" plan
print_flagged 1.plan count
run_step 2.apply "$ROOT/node_modules/.bin/declapract" apply
print_step 2.apply 8
cp "$REPO_DIR/package.json" "$LOG_DIR/package.applied.json"

# a bare repo holds no deps, so the apply writes each floor as its literal check; an adopter's
# repo holds real versions. pin each floor as its version, as an adopter's install would
sed -i -E "s/@declapract\\{check\\.minVersion\\('([^']+)'\\)(\\.ifInstalled\\(\\))?\\}/\\1/g" "$REPO_DIR/package.json"
cp "$REPO_DIR/package.json" "$LOG_DIR/package.pinned.json"

# a second apply, then the plan that must show only what a human must author
run_step 3.apply.again "$ROOT/node_modules/.bin/declapract" apply
print_step 3.apply.again 4
run_step 4.plan.final "$ROOT/node_modules/.bin/declapract" plan
print_flagged 4.plan.final

# install the emitted deps, then compile
if [[ "$COMPILE" == "run" ]]; then
  run_step 5.install pnpm install --no-frozen-lockfile --ignore-scripts --prefer-offline
  print_step 5.install 3
  run_step 6.compile pnpm exec tsc --noEmit --pretty false -p tsconfig.json
  print_step 6.compile 8

  # run the emitted cycle check, as the adopter's `npm run test:lint` does. report-only: in a bare
  # repo it still exits 1 on cycles inside floor-version packages, so it does not gate the walk
  CYCLES_FAILED_BEFORE="$STEP_FAILED"
  run_step 7.cycles pnpm run test:lint:cycles
  STEP_FAILED="$CYCLES_FAILED_BEFORE"
  print_step 7.cycles 12

  # report whether the installed pg-pool still holds the `require('pg')` fallback a shipped patch drops
  PG_POOL_INDEX="$(find "$REPO_DIR/node_modules/.pnpm" -maxdepth 4 -path '*/node_modules/pg-pool/index.js' | head -n 1)"
  if [[ -n "$PG_POOL_INDEX" ]]; then
    PG_POOL_ENTRY="$(basename "$(dirname "$(dirname "$(dirname "$PG_POOL_INDEX")")")" | sed -E 's/_patch_hash=[^_]+/_patch_hash=<hash>/')"
    PG_POOL_REQUIRES="$(grep -c "require('pg')" "$PG_POOL_INDEX" || true)"
    echo "   ├─ pg-pool (report)"
    echo "   │  ├─ install: ${PG_POOL_ENTRY}"
    echo "   │  └─ require('pg') left in index.js: ${PG_POOL_REQUIRES}"
    echo "   │"
  fi
fi

# halt on the first failed step
if [[ -n "$STEP_FAILED" ]]; then
  echo "   └─ 💥 step ${STEP_FAILED} failed; read .log/declapract.walk/${USECASE}/${STEP_FAILED}.log"
  echo ""
  echo "🐢 bummer dude..."
  exit 1
fi

# halt if the second apply left an automatic fix behind: the usecase does not converge
if [[ -n "$NOT_CONVERGED" ]]; then
  echo "   └─ 💥 the apply did not converge: ${NOT_CONVERGED} file(s) an apply still rewrites; read .log/declapract.walk/${USECASE}/4.plan.final.log"
  echo ""
  echo "🐢 bummer dude..."
  exit 1
fi

echo "   └─ ✨ every gated step exited 0, and the apply converged"
echo ""
echo "🐢 righteous!"
