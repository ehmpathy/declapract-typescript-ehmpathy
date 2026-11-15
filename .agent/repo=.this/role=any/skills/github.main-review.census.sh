#!/usr/bin/env bash
######################################################################
# .what = census, read only: for each repo in the named owners, does
#         main require a review approval before a merge?
#
# .why  = the provision-github practice declares main's protection; a
#         census shows which repos would gain a review gate on apply.
#         the caller token often holds push, not admin, so the classic
#         protection endpoint 404s. two signals a push token can read
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
#   rhx github.main-review.census
#   rhx github.main-review.census --owners 'ehmpathy ahbode'
#
# options:
#   --owners   space-separated orgs or users
#              (default: 'ehmpathy ahbode whodisio uladkasach')
#
# guarantee:
#   - every github call is a read (`--method GET`); it writes naught to github
#   - skips archived repos and forks (counted, not listed)
#   - verdict per repo: requires | lacks | unknown (no main branch | no decisive pr)
#   - full table kept in .log/github.main-review.census/census.md
#   - each run reads into its own scratch dir, so two runs never mix
#   - exit 0 = census done, 1 = a github read failed, 2 = bad input
######################################################################
set -euo pipefail

# print this header, from line 2 to its close rule of 20+ '#'
print_usage() {
  sed -n '2,/^#\{20,\}$/p' "$0"
}

OWNERS='ehmpathy ahbode whodisio uladkasach'
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill=*|--repo=*|--role=*) shift ;; # rhx forwards its own selectors; not ours to read
    --skill|--repo|--role) shift; [[ $# -gt 0 ]] && shift ;;
    --owners=*) OWNERS="${1#--owners=}"; shift ;;
    --owners)
      [[ $# -ge 2 ]] || { echo "✋ ConstraintError: --owners needs a value" >&2; echo "   └─ e.g.: rhx github.main-review.census --owners 'ehmpathy ahbode'" >&2; exit 2; }
      OWNERS="$2"; shift 2 ;;
    --help|-h) print_usage; exit 0 ;;
    *) echo "✋ ConstraintError: unknown arg '$1'" >&2; echo "   └─ run: rhx github.main-review.census --help" >&2; exit 2 ;;
  esac
done
[[ -z "$OWNERS" ]] && { echo "✋ ConstraintError: --owners is empty" >&2; echo "   └─ e.g.: rhx github.main-review.census --owners 'ehmpathy ahbode'" >&2; exit 2; }

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" \
  || { echo "✋ ConstraintError: the census must run inside a git repo" >&2; echo "   └─ fix: cd into a repo; its .log/ holds the table" >&2; exit 2; }
LOG_DIR="$ROOT/.log/github.main-review.census"
mkdir -p "$LOG_DIR"
TABLE="$LOG_DIR/census.md"

# one scratch dir per run; only the finished table and rows land at the stable paths
RUN_DIR="$(mktemp -d "$LOG_DIR/run.XXXXXX")"
trap 'rm -rf "$RUN_DIR"' EXIT
readonly ERR_FILE="$RUN_DIR/gh.stderr"
readonly ROWS="$RUN_DIR/rows.tsv"

echo "🐢 heres the wave..."
echo ""
echo "🐚 github.main-review.census --owners '$OWNERS'"
echo "   ├─ mode: read only"

# read one github api path; print the jq result, or '@absent' where github says it is not there
# .why = two answers mean "not there": a 404, and the 403 a free-plan private repo gives for a
#        feature its plan lacks (rulesets), which no repo on that plan can hold. any other
#        failure (network, rate limit, auth) must fail the census loud, never read as a verdict
get_or_absent() {
  local path='' jq='.' err=''
  for arg in "$@"; do
    case "$arg" in
      path=*) path="${arg#path=}" ;;
      jq=*) jq="${arg#jq=}" ;;
      err=*) err="${arg#err=}" ;;
    esac
  done
  # buffer stdout: on a failure gh prints the error body there too, which must never pass as a value
  local out
  if out=$(gh api --method GET "$path" --jq "$jq" 2>"$err"); then printf '%s' "$out"; return 0; fi
  if grep -q '(HTTP 404)' "$err"; then printf '%s' '@absent'; return 0; fi
  if grep -q 'Upgrade to GitHub Pro.*(HTTP 403)' "$err"; then printf '%s' '@absent'; return 0; fi
  return 1
}

# halt the census on a failed read, with the repo and the cause
fail_read() {
  local slug='' what='' err=''
  for arg in "$@"; do
    case "$arg" in
      slug=*) slug="${arg#slug=}" ;;
      what=*) what="${arg#what=}" ;;
      err=*) err="${arg#err=}" ;;
    esac
  done
  echo "💥 MalfunctionError: a github read failed, so the census cannot verdict '$slug'" >&2
  echo "   ├─ read: $what" >&2
  echo "   ├─ cause: $(head -n 3 "$err")" >&2
  echo "   └─ fix: retry once the cause clears (rate limit, network, or auth)" >&2
  exit 1
}

# emit one census row; the one place the row shape lives
# .note = fields, tab-separated: slug, release, verdict, signal, perm
emit_row() {
  local slug='' release='' verdict='' signal='' perm=''
  for arg in "$@"; do
    case "$arg" in
      slug=*) slug="${arg#slug=}" ;;
      release=*) release="${arg#release=}" ;;
      verdict=*) verdict="${arg#verdict=}" ;;
      signal=*) signal="${arg#signal=}" ;;
      perm=*) perm="${arg#perm=}" ;;
    esac
  done
  printf '%s\t%s\t%s\t%s\t%s\n' "$slug" "$release" "$verdict" "$signal" "$perm"
}

# read whether main is protected, as true | false; '@absent' where the repo has no main
get_one_main_protected() {
  local slug="${1#slug=}" found
  found=$(get_or_absent path="repos/$slug/branches/main" jq='.protected' err="$ERR_FILE") \
    || fail_read slug="$slug" what='main branch' err="$ERR_FILE"
  printf '%s' "$found"
}

# decide whether a listed repo is out of the census (archived or fork)
is_repo_skipped() {
  local archived='' fork=''
  for arg in "$@"; do
    case "$arg" in
      archived=*) archived="${arg#archived=}" ;;
      fork=*) fork="${arg#fork=}" ;;
    esac
  done
  [[ "$archived" == 'true' || "$fork" == 'true' ]]
}

# read whether the repo carries a release workflow, as yes | no
get_one_release_flag() {
  local slug="${1#slug=}" found
  found=$(get_or_absent path="repos/$slug/contents/.github/workflows/release.yml" jq='.name' err="$ERR_FILE") \
    || fail_read slug="$slug" what='release workflow' err="$ERR_FILE"
  [[ "$found" == '@absent' ]] && { printf 'no'; return 0; }
  printf 'yes'
}

# read the most approvals any active ruleset pull_request rule on main requires; 0 where none
get_one_ruleset_approval_count() {
  local slug="${1#slug=}" count
  count=$(get_or_absent path="repos/$slug/rules/branches/main" \
    jq='[.[] | select(.type == "pull_request") | .parameters.required_approving_review_count] | max // 0' \
    err="$ERR_FILE") || fail_read slug="$slug" what='rulesets on main' err="$ERR_FILE"
  [[ "$count" == '@absent' ]] && { printf '0'; return 0; }
  printf '%s' "$count"
}

# read the approvals classic protection on main requires (admin token only); 0 where none
get_one_protection_approval_count() {
  local slug="${1#slug=}" count
  count=$(get_or_absent path="repos/$slug/branches/main/protection" \
    jq='.required_pull_request_reviews.required_approving_review_count // 0' err="$ERR_FILE") \
    || fail_read slug="$slug" what='main protection' err="$ERR_FILE"
  [[ "$count" == '@absent' ]] && { printf '0'; return 0; }
  printf '%s' "$count"
}

# read the first decisive pr among the latest 10 into main, as "<number>\t<decision>"
# .why = empty or REVIEW_REQUIRED decides a verdict; APPROVED and CHANGES_REQUESTED appear on any
#        reviewed pr, gate or not, so they are skipped. prints naught where no pr decides
get_one_pr_decision() {
  local slug="${1#slug=}" out
  out=$(gh pr list --repo "$slug" --base main --state all --limit 10 \
    --json number,reviewDecision \
    --jq '[.[] | select((.reviewDecision // "") == "" or .reviewDecision == "REVIEW_REQUIRED")][0] // empty | "\(.number)\t\(.reviewDecision // "")"' \
    2>"$ERR_FILE") || fail_read slug="$slug" what='recent prs into main' err="$ERR_FILE"
  printf '%s' "$out"
}

# emit the verdict for one repo, as one census row
get_one_verdict() {
  local slug='' perm=''
  for arg in "$@"; do
    case "$arg" in
      slug=*) slug="${arg#slug=}" ;;
      perm=*) perm="${arg#perm=}" ;;
    esac
  done
  local release protected rulesetCount protectionCount prDecision prNumber prReview

  # does the repo carry a release workflow?
  release=$(get_one_release_flag slug="$slug")

  # is main protected at all?
  protected=$(get_one_main_protected slug="$slug")
  if [[ "$protected" == '@absent' ]]; then
    emit_row slug="$slug" release="$release" verdict=unknown signal='no main branch' perm="$perm"
    return 0
  fi

  # an active ruleset pull_request rule?
  rulesetCount=$(get_one_ruleset_approval_count slug="$slug")
  if [[ "$rulesetCount" -gt 0 ]]; then
    emit_row slug="$slug" release="$release" verdict=requires signal="ruleset: $rulesetCount approval(s)" perm="$perm"
    return 0
  fi

  # main unprotected and no ruleset: no review gate
  if [[ "$protected" != 'true' ]]; then
    emit_row slug="$slug" release="$release" verdict=lacks signal='main unprotected' perm="$perm"
    return 0
  fi

  # an admin token reads classic protection directly
  if [[ "$perm" == 'ADMIN' ]]; then
    protectionCount=$(get_one_protection_approval_count slug="$slug")
    if [[ "$protectionCount" -gt 0 ]]; then
      emit_row slug="$slug" release="$release" verdict=requires signal="protection: $protectionCount approval(s)" perm="$perm"
      return 0
    fi
    emit_row slug="$slug" release="$release" verdict=lacks signal='protection: 0 approvals' perm="$perm"
    return 0
  fi

  # a push token reads the first decisive reviewDecision among the latest prs into main
  prDecision=$(get_one_pr_decision slug="$slug")
  if [[ -z "$prDecision" ]]; then
    emit_row slug="$slug" release="$release" verdict=unknown signal='protected; no decisive pr in the latest 10' perm="$perm"
    return 0
  fi
  IFS=$'\t' read -r prNumber prReview <<< "$prDecision"
  if [[ "$prReview" == 'REVIEW_REQUIRED' ]]; then
    emit_row slug="$slug" release="$release" verdict=requires signal="pr #$prNumber reviewDecision=REVIEW_REQUIRED" perm="$perm"
    return 0
  fi
  emit_row slug="$slug" release="$release" verdict=lacks signal="pr #$prNumber reviewDecision=(empty)" perm="$perm"
}

# list every repo of one owner, one "<slug>\t<archived>\t<fork>\t<perm>" line each
# .why = an owner github does not know is a caller typo (exit 2), told apart by a 404 on
#        users/<owner>; any other failure is a malfunction. a list that reaches the cap fails
#        loud, so the census never undercounts an owner
readonly REPO_LIST_CAP=1000
get_all_repos() {
  local owner="${1#owner=}" out count known
  if out=$(gh repo list "$owner" --limit "$REPO_LIST_CAP" --json nameWithOwner,isArchived,isFork,viewerPermission \
    --jq '.[] | "\(.nameWithOwner)\t\(.isArchived)\t\(.isFork)\t\(.viewerPermission)"' 2>"$ERR_FILE"); then
    count=$(printf '%s' "$out" | awk 'NF { n++ } END { print n + 0 }')
    if [[ "$count" -ge "$REPO_LIST_CAP" ]]; then
      echo "💥 MalfunctionError: the repo list for '$owner' reached the cap of $REPO_LIST_CAP, so the census would undercount" >&2
      echo "   └─ fix: raise REPO_LIST_CAP in this skill, then rerun" >&2
      exit 1
    fi
    printf '%s' "$out"
    return 0
  fi

  # an owner github does not know reads 404 on users/<owner>; a probe that fails reads as unknown cause
  known=$(get_or_absent path="users/$owner" jq='.login' err="$RUN_DIR/gh.owner.stderr") || known='@unread'
  if [[ "$known" == '@absent' ]]; then
    echo "✋ ConstraintError: github knows no owner '$owner'" >&2
    echo "   └─ fix: check the owner name in --owners" >&2
    exit 2
  fi
  echo "💥 MalfunctionError: could not list repos for '$owner'" >&2
  echo "   ├─ cause: $(head -n 3 "$ERR_FILE")" >&2
  echo "   └─ fix: retry once the cause clears (rate limit, network, or auth: gh auth status)" >&2
  exit 1
}

# render the rows as markdown table rows, lacks first, then by slug (bytewise, so every machine agrees)
render_table_rows() {
  LC_ALL=C sort -t$'\t' -k3,3 -k1,1 "$ROWS" | awk -F'\t' '{ printf "| %s | %s | %s | %s |\n", $1, $2, $3, $4 }'
}

# count the rows with a given verdict (all rows where none given); with release=yes, only those with a release workflow
count_rows() {
  local verdict='' release=''
  for arg in "$@"; do
    case "$arg" in
      verdict=*) verdict="${arg#verdict=}" ;;
      release=*) release="${arg#release=}" ;;
    esac
  done
  awk -F'\t' -v v="$verdict" -v r="$release" '(v == "" || $3 == v) && (r == "" || $2 == r)' "$ROWS" | wc -l | tr -d ' '
}

# walk each owner
: > "$ROWS"
SKIPPED=0
for owner in $OWNERS; do
  repos=$(get_all_repos owner="$owner")
  while IFS=$'\t' read -r slug archived fork perm; do
    [[ -z "$slug" ]] && continue
    if is_repo_skipped archived="$archived" fork="$fork"; then SKIPPED=$((SKIPPED + 1)); continue; fi
    get_one_verdict slug="$slug" perm="$perm" >> "$ROWS"
  done <<< "$repos"
done

# render the table, then land table and rows at their stable paths
{
  echo '| repo | release workflow | main requires review | signal |'
  echo '|------|------------------|----------------------|--------|'
  render_table_rows
} > "$RUN_DIR/census.md"
mv "$RUN_DIR/census.md" "$TABLE"
cp "$ROWS" "$LOG_DIR/rows.tsv"

echo "   ├─ repos read: $(count_rows) (skipped $SKIPPED archived or fork)"
echo "   ├─ verdicts"
echo "   │  ├─ requires: $(count_rows verdict=requires)"
echo "   │  ├─ lacks: $(count_rows verdict=lacks) ($(count_rows verdict=lacks release=yes) with a release workflow)"
echo "   │  └─ unknown: $(count_rows verdict=unknown)"
echo "   └─ table: ${TABLE#"$ROOT"/}"
echo ""
echo "🐢 righteous! census done"
