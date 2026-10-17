#!/usr/bin/env bash
######################################################################
# .what = record a disposition on many concerns of one peer reviewer,
#         in one call
#
# .why  = a lane with ten nitpicks owes ten `route.stone.set` calls
#         (one per concern, by contract). a shell loop is not a paved
#         command, so the driver would issue each by hand. this runs
#         the same per-concern calls, in order, and names each refusal
#
# usage:
#   rhx route.concerns.dispose --stone <stone> --with <reviewer> \
#     [--dispute 'nitpick.1 nitpick.2' --why <fulcrum-path>] \
#     [--concede 'nitpick.3' --severity better|urgent]
#
# guarantee:
#   - one `rhx route.stone.set` per concern; no --about all
#   - each dispute carries the --why fulcrum; each concede carries --severity
#   - a recorded disposition that halts the stone counts as recorded
#   - a refused call is printed with its full output to stderr
#   - exit 0 = all recorded, 2 = bad input or any refusal
######################################################################
set -euo pipefail

STONE=""
WITH=""
DISPUTE=""
WHY=""
CONCEDE=""
SEVERITY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stone) STONE="$2"; shift 2 ;;
    --with) WITH="$2"; shift 2 ;;
    --dispute) DISPUTE="$2"; shift 2 ;;
    --why) WHY="$2"; shift 2 ;;
    --concede) CONCEDE="$2"; shift 2 ;;
    --severity) SEVERITY="$2"; shift 2 ;;
    # the rhx dispatcher passes its own selector args; skip them
    --skill|--repo|--role) shift 2 ;;
    --help|-h)
      sed -n '2,24p' "$0"
      exit 0
      ;;
    *)
      echo "✋ ConstraintError: unknown arg '$1'" >&2
      exit 2
      ;;
  esac
done

# reject absent required inputs
if [[ -z "$STONE" || -z "$WITH" ]]; then
  echo "✋ ConstraintError: --stone and --with are required" >&2
  exit 2
fi
if [[ -n "$DISPUTE" && -z "$WHY" ]]; then
  echo "✋ ConstraintError: --dispute needs --why <fulcrum-path>" >&2
  exit 2
fi
if [[ -n "$CONCEDE" && -z "$SEVERITY" ]]; then
  echo "✋ ConstraintError: --concede needs --severity better|urgent" >&2
  exit 2
fi

echo "🐢 righteous"
echo ""
echo "🐚 route.concerns.dispose --stone $STONE --with $WITH"

# run one route.stone.set; route.stone.set exits 2 both on a refusal and on a recorded
# disposition that halts the stone (e.g. a lane's last concern), so read its stdout to tell
FAILED=0
recordOne() {
  local label="$1"
  shift
  local output
  output="$(rhx route.stone.set "$@" 2>&1)" && { echo "   ├─ $label"; return; }
  if [[ "$output" == *"so it is"* ]]; then
    echo "   ├─ $label (recorded; the stone halts until re-arrival)"
    return
  fi
  echo "   ├─ ✋ refused: $label"
  printf '%s\n' "$output" | sed 's/^/   │  /' >&2
  FAILED=1
}

# record each dispute
for concern in $DISPUTE; do
  recordOne "disputed: $concern" --stone "$STONE" --as disputed --with "$WITH" --about "$concern" --why "$WHY"
done

# record each concession
for concern in $CONCEDE; do
  recordOne "conceded ($SEVERITY): $concern" --stone "$STONE" --as conceded --with "$WITH" --about "$concern" --severity "$SEVERITY"
done

echo "   └─ done"
if [[ "$FAILED" -ne 0 ]]; then exit 2; fi
