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

# reject a flag that arrives with no value, before `shift 2` fails silent under set -e
# usage: require_value <flag> <value>
require_value() {
  if [[ -z "${2:-}" || "${2:-}" == --* ]]; then
    echo "✋ ConstraintError: $1 needs a value (see --help)" >&2
    exit 2
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stone) require_value "$1" "${2:-}"; STONE="$2"; shift 2 ;;
    --with) require_value "$1" "${2:-}"; WITH="$2"; shift 2 ;;
    --dispute) require_value "$1" "${2:-}"; DISPUTE="$2"; shift 2 ;;
    --why) require_value "$1" "${2:-}"; WHY="$2"; shift 2 ;;
    --concede) require_value "$1" "${2:-}"; CONCEDE="$2"; shift 2 ;;
    --severity) require_value "$1" "${2:-}"; SEVERITY="$2"; shift 2 ;;
    # the rhx dispatcher passes its own selector args; skip them
    --skill|--repo|--role) shift 2 ;;
    --help|-h)
      awk 'NR > 2 && /^#####/ { exit } NR > 2' "$0"
      exit 0
      ;;
    *)
      echo "✋ ConstraintError: unknown arg '$1' (see --help)" >&2
      exit 2
      ;;
  esac
done

# reject absent required inputs
if [[ -z "$STONE" || -z "$WITH" ]]; then
  echo "✋ ConstraintError: --stone and --with are required" >&2
  echo "   └─ e.g. rhx route.concerns.dispose --stone 5.3.verification --with repo-rules --concede 'nitpick.1' --severity better" >&2
  exit 2
fi
if [[ -z "$DISPUTE" && -z "$CONCEDE" ]]; then
  echo "✋ ConstraintError: name at least one concern via --dispute or --concede" >&2
  echo "   └─ e.g. --concede 'nitpick.1 nitpick.2' --severity better" >&2
  exit 2
fi
if [[ -n "$DISPUTE" && -z "$WHY" ]]; then
  echo "✋ ConstraintError: --dispute needs --why <fulcrum-path>" >&2
  echo "   └─ e.g. --dispute 'nitpick.1' --why .behavior/<route>/.fulcrums/inventory.of=fulcrums.case=F1-<slug>.md" >&2
  exit 2
fi
if [[ -n "$CONCEDE" && "$SEVERITY" != "better" && "$SEVERITY" != "urgent" ]]; then
  echo "✋ ConstraintError: --concede needs --severity better|urgent, got '${SEVERITY}'" >&2
  echo "   └─ e.g. --concede 'nitpick.1' --severity better (urgent only for a nameable shipped harm)" >&2
  exit 2
fi

echo "🐢 lets ride..."
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
    echo "   ├─ $label (recorded; the stone halts until its next --as arrived)"
    return
  fi
  echo "   ├─ ✋ refused: $label"
  # the refusal's own lines, as child branches under its label
  echo "✋ ConstraintError: route.stone.set refused ${label}" >&2
  printf '%s\n' "$output" | awk '{ a[NR] = $0 } END { for (i = 1; i <= NR; i++) printf "   %s %s\n", (i == NR ? "└─" : "├─"), a[i] }' >&2
  FAILED=$((FAILED + 1))
}

# record each dispute
for concern in $DISPUTE; do
  recordOne "disputed: $concern" --stone "$STONE" --as disputed --with "$WITH" --about "$concern" --why "$WHY"
done

# record each concession
for concern in $CONCEDE; do
  recordOne "conceded ($SEVERITY): $concern" --stone "$STONE" --as conceded --with "$WITH" --about "$concern" --severity "$SEVERITY"
done

# close on the outcome: any refusal reads as one, never as done
if [[ "$FAILED" -ne 0 ]]; then
  echo "   └─ ✋ ConstraintError: ${FAILED} refused; each refusal's output is on stderr"
  echo ""
  echo "🐢 bummer dude..."
  exit 2
fi
echo "   └─ done"
echo ""
echo "🐢 righteous!"
