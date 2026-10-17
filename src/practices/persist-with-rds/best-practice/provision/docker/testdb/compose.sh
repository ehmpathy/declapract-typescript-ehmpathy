#!/usr/bin/env bash
######################################################################
# .what = run docker compose on this checkout's testdb
#
# .why  = two worktrees of one repo must never share one testdb. this
#         wrapper exports the compose project suffix and the host port
#         that getTestdbIdentity derives for this checkout, so the
#         compose file, the app, and the schema provisioner all agree
#
# usage:
#   bash provision/docker/testdb/compose.sh up -d
#   bash provision/docker/testdb/compose.sh down
#
# guarantee:
#   - ci and a main checkout keep the port config/test.json declares
#   - a linked worktree gets its own project, container, and port
#   - every arg passes through to docker compose unchanged
######################################################################
set -euo pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(git -C "$SELF_DIR" rev-parse --show-toplevel)"

# derive this checkout's identity from the one util every port reader shares
IDENTITY="$(cd "$ROOT_DIR" && node -r esbuild-register -e "
  const { getTestdbIdentity } = require('./src/.test/assets/database/getTestdbIdentity');
  const portDeclared = require('./config/test.json').database.tunnel.local.port;
  const identity = getTestdbIdentity({ portDeclared });
  process.stdout.write(identity.suffix + ' ' + identity.port);
")"

# halt on an identity that is not "<suffix> <port>", so compose never binds a malformed port
if [[ ! "$IDENTITY" =~ ^[^\ ]*\ [0-9]+$ ]]; then
  echo "💥 MalfunctionError: getTestdbIdentity yielded '$IDENTITY', not '<suffix> <port>'" >&2
  echo "   └─ fix: check src/.test/assets/database/getTestdbIdentity.ts and config/test.json database.tunnel.local.port" >&2
  exit 1
fi

# split "<suffix> <port>" at its one space: the suffix before it, the port after it
export TESTDB_SUFFIX="${IDENTITY% *}"
export TESTDB_PORT="${IDENTITY#* }"

exec docker compose -f "$SELF_DIR/docker-compose.yml" "$@"
