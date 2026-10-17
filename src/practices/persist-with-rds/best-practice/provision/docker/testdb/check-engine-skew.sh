#!/usr/bin/env bash
######################################################################
# .what = compare the testdb's postgres major against the livedb's.
#         halt when the testdb leads; warn when it trails
#
# .why  = the suite runs against the testdb alone. a testdb ahead of the
#         livedb can pass on a feature the livedb rejects — a false green
#         that ships. a testdb behind the livedb is the safe skew: the newer
#         major accepts near all of the older one's sql
#
# .note = the livedb is the cluster config/test.json names, read with the
#         aws access the integration suite already holds. the integration
#         suite runs this check against the livedb, so a testdb that leads
#         it fails the suite
#
# usage:
#   bash provision/docker/testdb/check-engine-skew.sh
#   bash provision/docker/testdb/check-engine-skew.sh --livedb-version 13.23
#   bash provision/docker/testdb/check-engine-skew.sh --dockerfile path/to/build-image.dockerfile
#   bash provision/docker/testdb/check-engine-skew.sh --declared-version 17.11
#
# options:
#   --livedb-version    the livedb's engine version; skips the aws read when given
#   --declared-version  the engine version the infrastructure declares; when
#                       given, a halt names how the skew arrived and prints the
#                       one fix for it. absent, the halt prints both fixes
#   --dockerfile        the testdb image (default: beside this file)
#   --config            the config that names the livedb (default: config/test.json)
#   --help, -h          print this block and exit
#
#   the livedb read names the aws cluster from the config's tunnel
#
# guarantee:
#   - exit 0 = majors match, or the testdb trails the livedb (a warn)
#   - exit 1 = malfunction (the config names no cluster, the aws read failed or returned no version, the dockerfile is unreadable or has no postgres pin)
#   - exit 2 = constraint (the testdb leads the livedb, or an arg is absent or malformed)
######################################################################
set -euo pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKERFILE="$SELF_DIR/build-image.dockerfile"
CONFIG="$SELF_DIR/../../../config/test.json"
LIVEDB_VERSION=""
DECLARED_VERSION=""

# fail on a flag given with no value, or with the next flag where its value was owed
require_value() {
  local flag="" value=""
  local pair
  for pair in "$@"; do
    case "$pair" in
      flag=*) flag="${pair#flag=}" ;;
      value=*) value="${pair#value=}" ;;
    esac
  done
  if [[ -z "$value" || "$value" == --* ]]; then
    echo "✋ ConstraintError: $flag needs a value" >&2
    echo "   └─ fix: see $0 --help" >&2
    exit 2
  fi
}

# parse named args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h) sed -n '3,/^######/{/^######/!p;}' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    --livedb-version) require_value flag="$1" value="${2:-}"; LIVEDB_VERSION="$2"; shift 2 ;;
    --declared-version) require_value flag="$1" value="${2:-}"; DECLARED_VERSION="$2"; shift 2 ;;
    --dockerfile) require_value flag="$1" value="${2:-}"; DOCKERFILE="$2"; shift 2 ;;
    --config) require_value flag="$1" value="${2:-}"; CONFIG="$2"; shift 2 ;;
    *)
      echo "✋ ConstraintError: unknown arg '$1'" >&2
      echo "   └─ fix: see $0 --help" >&2
      exit 2
      ;;
  esac
done

# fail on a dockerfile the grep cannot read, so a read failure never reads as an absent pin
if [[ ! -f "$DOCKERFILE" || ! -r "$DOCKERFILE" ]]; then
  echo "💥 MalfunctionError: cannot read the testdb dockerfile at $DOCKERFILE" >&2
  echo "   └─ fix: pass --dockerfile with a readable path, or restore build-image.dockerfile beside this file" >&2
  exit 1
fi

# read the testdb major from its image pin; the grep exits 1 on no match, which the guard below reports
TESTDB_MAJOR="$(grep -oE '^FROM postgres:[0-9]+' "$DOCKERFILE" | grep -oE '[0-9]+$' || true)"
if [[ -z "$TESTDB_MAJOR" ]]; then
  echo "💥 MalfunctionError: no 'FROM postgres:<major>' pin found in $DOCKERFILE" >&2
  echo "   └─ fix: pin a major, like 'FROM postgres:17.11', or pass --dockerfile with the testdb image" >&2
  exit 1
fi

# reject a supplied version that is not a postgres version
VERSION_SHAPE='^[0-9]+(\.[0-9]+)*$'
for supplied in "$LIVEDB_VERSION" "$DECLARED_VERSION"; do
  if [[ -n "$supplied" && ! "$supplied" =~ $VERSION_SHAPE ]]; then
    echo "✋ ConstraintError: '$supplied' is not a postgres version" >&2
    echo "   └─ fix: pass a version like 17.11 or 17" >&2
    exit 2
  fi
done

# read the livedb version, unless supplied
if [[ -z "$LIVEDB_VERSION" ]]; then
  CLUSTER="$(jq -r '.database.tunnel.cluster.name // empty' "$CONFIG" || true)"
  if [[ -z "$CLUSTER" ]]; then
    echo "💥 MalfunctionError: no cluster name at .database.tunnel.cluster.name in $CONFIG" >&2
    echo "   └─ fix: the file must exist, parse as json, and name the aws cluster the tunnel reaches" >&2
    exit 1
  fi
  if ! LIVEDB_VERSION="$(aws rds describe-db-clusters \
    --db-cluster-identifier "$CLUSTER" \
    --query 'DBClusters[0].EngineVersion' \
    --output text)"; then
    echo "💥 MalfunctionError: could not read the engine version of cluster '$CLUSTER'" >&2
    echo "   └─ fix: the caller needs aws auth with rds:DescribeDBClusters on the livedb's account" >&2
    exit 1
  fi
  if [[ ! "$LIVEDB_VERSION" =~ $VERSION_SHAPE ]]; then
    echo "💥 MalfunctionError: cluster '$CLUSTER' reported engine version '$LIVEDB_VERSION', which is not a postgres version" >&2
    exit 1
  fi
fi

# the livedb major: its version up to the first dot (17.11 → 17)
LIVEDB_MAJOR="${LIVEDB_VERSION%%.*}"

# report the two engines
echo "🔭 engine skew"
echo "   ├─ testdb: postgres $TESTDB_MAJOR ($DOCKERFILE)"
echo "   └─ livedb: postgres $LIVEDB_VERSION"

# halt when the testdb leads the livedb
if (( TESTDB_MAJOR > LIVEDB_MAJOR )); then
  echo "✋ ConstraintError: the testdb (postgres $TESTDB_MAJOR) leads the livedb (postgres $LIVEDB_MAJOR)" >&2
  echo "   ├─ why: a green suite here can rest on a postgres $TESTDB_MAJOR feature the livedb rejects" >&2

  # name the arrival when the declared target is known
  DECLARED_MAJOR="${DECLARED_VERSION%%.*}"
  if [[ -n "$DECLARED_MAJOR" ]] && (( DECLARED_MAJOR > LIVEDB_MAJOR )); then
    echo "   ├─ how: the livedb sits below its declared target $DECLARED_MAJOR — a flip was reverted, or has not yet applied" >&2
    echo "   └─ fix: pin the testdb to postgres $LIVEDB_MAJOR until the flip holds. do not re-flip a reverted livedb from here" >&2
    exit 2
  fi
  if [[ -n "$DECLARED_MAJOR" ]]; then
    echo "   ├─ how: the livedb matches its declared target $DECLARED_MAJOR — the testdb pin moved ahead of the flip" >&2
    echo "   └─ fix: declare postgres $TESTDB_MAJOR in the infrastructure, then merge after the livedb reads it" >&2
    exit 2
  fi

  echo "   └─ fix: one of two, by how the skew arrived" >&2
  echo "      ├─ the pin moved before the flip: merge after the livedb reads postgres $TESTDB_MAJOR" >&2
  echo "      └─ the livedb fell back:          pin the testdb to postgres $LIVEDB_MAJOR until the flip holds" >&2
  exit 2
fi

# warn when the testdb trails the livedb
if (( TESTDB_MAJOR < LIVEDB_MAJOR )); then
  echo ""
  echo "::warning title=engine skew::testdb postgres $TESTDB_MAJOR trails the livedb's postgres $LIVEDB_MAJOR. safe, but bump the pin on the next declapract upgrade"
  exit 0
fi

echo "✨ majors match"
