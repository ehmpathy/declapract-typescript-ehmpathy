#!/usr/bin/env bash
######################################################################
# .what = census, read only: for each repo in the named owners, does
#         main require a review approval before a merge?
#
# .why  = the provision-github practice declares main's protection; a
#         census shows which repos would gain a review gate on apply.
#         the caller token often holds push, not admin, so the classic
#         protection endpoint 404s. two signals a push token CAN read
#         decide it instead:
#           - ruleset: an active `pull_request` rule on main
#           - classic: the graphql `reviewDecision` of the latest prs
#             into main. a gated repo never yields an empty decision
#             (unreviewed = REVIEW_REQUIRED, merged = APPROVED), so:
#               empty            → lacks
#               REVIEW_REQUIRED  → requires
#               APPROVED | CHANGES_REQUESTED → ambiguous: github sets
#               these on any reviewed pr, gate or not; read the next pr
#             proven against facebook/react (gated) and this repo
#             (ungated, yet #761 reads APPROVED)
#         an admin token reads the protection endpoint directly
#
# .note = reviewDecision describes recent prs, so a gate added after
#         the latest pr shows only once a new pr opens
#
# usage:
#   rhx github.census.main-review
#   rhx github.census.main-review --owners 'ehmpathy ahbode'
#
# options:
#   --owners   space-separated orgs or users
#              (default: 'ehmpathy ahbode whodisio uladkasach')
#
# guarantee:
#   - every github call is a GET; it writes naught to github
#   - skips archived repos and forks (counted, not listed)
#   - verdict per repo: requires | lacks | unknown (no decisive pr)
#   - full table kept in .log/github.census.main-review/census.md
#   - exit 0 = census done, 1 = a github read failed, 2 = bad input
######################################################################
set -euo pipefail

OWNERS='ehmpathy ahbode whodisio uladkasach'
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill|--repo|--role) shift; [[ $# -gt 0 ]] && shift ;; # rhx forwards its own selectors; not ours to read
    --owners) OWNERS="${2:-}"; shift 2 ;;
    --help|-h) sed -n '2,41p' "$0"; exit 0 ;;
    *) echo "✋ ConstraintError: unknown arg '$1'" >&2; echo "   └─ run: rhx github.census.main-review --help" >&2; exit 2 ;;
  esac
done
[[ -z "$OWNERS" ]] && { echo "✋ ConstraintError: --owners is empty" >&2; exit 2; }

ROOT="$(git rev-parse --show-toplevel)"
LOG_DIR="$ROOT/.log/github.census.main-review"
mkdir -p "$LOG_DIR"
TABLE="$LOG_DIR/census.md"

echo "🐢 heres the wave..."
echo ""
echo "🐚 github.census.main-review --owners '$OWNERS'"
echo "   ├─ mode: read only (GET)"

# emit the verdict for one repo, as a tab-separated row
get_one_verdict() {
  local slug="$1" perm="$2"
  local release protected ruleset classic verdict signal

  # does the repo carry a release workflow?
  release=no
  gh api --method GET "repos/$slug/contents/.github/workflows/release.yml" --silent 2>/dev/null && release=yes

  # is main protected at all?
  protected=$(gh api --method GET "repos/$slug/branches/main" --jq '.protected' 2>/dev/null || echo 'no-main')
  if [[ "$protected" == 'no-main' ]]; then
    printf '%s\t%s\t%s\t%s\t%s\n' "$slug" "$release" 'unknown' 'no main branch' "$perm"
    return 0
  fi

  # an active ruleset pull_request rule?
  ruleset=$(gh api --method GET "repos/$slug/rules/branches/main" \
    --jq '[.[] | select(.type == "pull_request") | .parameters.required_approving_review_count] | max // empty' 2>/dev/null || true)
  if [[ -n "$ruleset" && "$ruleset" -gt 0 ]]; then
    printf '%s\t%s\t%s\t%s\t%s\n' "$slug" "$release" 'requires' "ruleset: $ruleset approval(s)" "$perm"
    return 0
  fi

  # main unprotected and no ruleset: no review gate
  if [[ "$protected" != 'true' ]]; then
    printf '%s\t%s\t%s\t%s\t%s\n' "$slug" "$release" 'lacks' 'main unprotected' "$perm"
    return 0
  fi

  # an admin token reads classic protection directly
  if [[ "$perm" == 'ADMIN' ]]; then
    classic=$(gh api --method GET "repos/$slug/branches/main/protection" \
      --jq '.required_pull_request_reviews.required_approving_review_count // 0')
    verdict=lacks; signal='protection: 0 approvals'
    [[ "$classic" -gt 0 ]] && { verdict=requires; signal="protection: $classic approval(s)"; }
    printf '%s\t%s\t%s\t%s\t%s\n' "$slug" "$release" "$verdict" "$signal" "$perm"
    return 0
  fi

  # a push token reads the first decisive reviewDecision among the latest prs into main
  classic=$(gh pr list --repo "$slug" --base main --state all --limit 10 \
    --json number,reviewDecision \
    --jq '[.[] | select((.reviewDecision // "") == "" or .reviewDecision == "REVIEW_REQUIRED")][0] // empty | "\(.number) \(.reviewDecision // "")"' \
    2>/dev/null || true)
  if [[ -z "$classic" ]]; then
    printf '%s\t%s\t%s\t%s\t%s\n' "$slug" "$release" 'unknown' 'protected; no decisive pr in the latest 10' "$perm"
    return 0
  fi
  verdict=lacks; signal="pr #${classic%% *} reviewDecision=(empty)"
  [[ "${classic#* }" == 'REVIEW_REQUIRED' ]] && { verdict=requires; signal="pr #${classic%% *} reviewDecision=REVIEW_REQUIRED"; }
  printf '%s\t%s\t%s\t%s\t%s\n' "$slug" "$release" "$verdict" "$signal" "$perm"
}

# walk each owner
ROWS="$LOG_DIR/rows.tsv"
: > "$ROWS"
SKIPPED=0
for owner in $OWNERS; do
  repos=$(gh repo list "$owner" --limit 1000 --json nameWithOwner,isArchived,isFork,viewerPermission \
    --jq '.[] | "\(.nameWithOwner)\t\(.isArchived)\t\(.isFork)\t\(.viewerPermission)"') \
    || { echo "💥 MalfunctionError: could not list repos for '$owner'" >&2; exit 1; }
  while IFS=$'\t' read -r slug archived fork perm; do
    [[ -z "$slug" ]] && continue
    if [[ "$archived" == 'true' || "$fork" == 'true' ]]; then SKIPPED=$((SKIPPED + 1)); continue; fi
    get_one_verdict "$slug" "$perm" >> "$ROWS"
  done <<< "$repos"
done

# render the table, lacks first
{
  echo '| repo | release workflow | main requires review | signal |'
  echo '|------|------------------|----------------------|--------|'
  sort -t$'\t' -k3,3 -k1,1 "$ROWS" | awk -F'\t' '{ printf "| %s | %s | %s | %s |\n", $1, $2, $3, $4 }'
} > "$TABLE"

TOTAL=$(wc -l < "$ROWS" | tr -d ' ')
REQUIRES=$(awk -F'\t' '$3=="requires"' "$ROWS" | wc -l | tr -d ' ')
LACKS=$(awk -F'\t' '$3=="lacks"' "$ROWS" | wc -l | tr -d ' ')
UNKNOWN=$(awk -F'\t' '$3=="unknown"' "$ROWS" | wc -l | tr -d ' ')
LACKS_RELEASED=$(awk -F'\t' '$3=="lacks" && $2=="yes"' "$ROWS" | wc -l | tr -d ' ')

echo "   ├─ repos read: $TOTAL (skipped $SKIPPED archived or fork)"
echo "   ├─ verdicts"
echo "   │  ├─ requires: $REQUIRES"
echo "   │  ├─ lacks: $LACKS ($LACKS_RELEASED with a release workflow)"
echo "   │  └─ unknown: $UNKNOWN"
echo "   └─ table: ${TABLE#"$ROOT"/}"
echo ""
echo "🐢 righteous! census done"