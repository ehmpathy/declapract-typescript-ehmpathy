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
#   bash provision/docker/testdb/compose.sh clear
#
# guarantee:
#   - ci and a main checkout keep the port config/test.json declares
#   - a linked worktree gets its own project, container, and port
#   - every arg passes through to docker compose unchanged, except `clear`
#   - `clear` removes only this checkout's own compose project, never a
#     container another repo or worktree owns; if its port is still held
#     after, it halts with exit 2 and names the holder
######################################################################
set -euo pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(git -C "$SELF_DIR" rev-parse --show-toplevel)"

# an absent config names itself, as the port override does, never as node's module-load words
if [ ! -f "$ROOT_DIR/config/test.json" ]; then
  echo "✋ ConstraintError: config/test.json not found — the testdb identity cannot be derived" >&2
  echo "   └─ fix: add config/test.json with database.tunnel.local.port, or run 'npx declapract apply' to restore it" >&2
  exit 2
fi

# derive this checkout's identity from the one util every port reader shares
# .note = node names its own fault on one line, so a human never meets a raw stack
IDENTITY_FAULT_FILE="$(mktemp)"
if ! IDENTITY="$(cd "$ROOT_DIR" && node -r esbuild-register -e "
  try {
    const { getTestdbIdentity } = require('./src/.test/assets/database/getTestdbIdentity');
    const portDeclared = require('./config/test.json')?.database?.tunnel?.local?.port;
    if (typeof portDeclared !== 'number') throw new Error('config/test.json declares no numeric database.tunnel.local.port');
    const identity = getTestdbIdentity({ portDeclared });
    process.stdout.write(identity.suffix + ' ' + identity.port);
  } catch (error) {
    process.stderr.write(String(error instanceof Error ? error.message : error).split('\n')[0]);
    process.exit(2);
  }
" 2>"$IDENTITY_FAULT_FILE")"; then
  echo "✋ ConstraintError: could not derive this checkout's testdb identity" >&2
  echo "   ├─ cause: $(cat "$IDENTITY_FAULT_FILE")" >&2
  echo "   └─ fix: declare database.tunnel.local.port in config/test.json, or run 'npx declapract apply' to restore it" >&2
  rm -f "$IDENTITY_FAULT_FILE"
  exit 2
fi
rm -f "$IDENTITY_FAULT_FILE"

# halt on an identity that is not "<suffix> <port>", so compose never binds a malformed port
if [[ ! "$IDENTITY" =~ ^[^\ ]*\ [0-9]+$ ]]; then
  echo "💥 MalfunctionError: getTestdbIdentity yielded '$IDENTITY', not '<suffix> <port>'" >&2
  echo "   └─ fix: check src/.test/assets/database/getTestdbIdentity.ts and config/test.json database.tunnel.local.port" >&2
  exit 1
fi

# split "<suffix> <port>" at its one space: the suffix before it, the port after it
export TESTDB_SUFFIX="${IDENTITY% *}"
export TESTDB_PORT="${IDENTITY#* }"

# any verb but clear passes straight through to compose
if [[ "${1:-}" != "clear" ]]; then
  exec docker compose -f "$SELF_DIR/docker-compose.yml" "$@"
fi

# clear: remove this checkout's own project, by project, never by port
if ! docker compose -f "$SELF_DIR/docker-compose.yml" down --remove-orphans; then
  echo "💥 MalfunctionError: could not take down this checkout's testdb compose project" >&2
  echo "   ├─ state: the project may still run; no other container was touched" >&2
  echo "   └─ fix: check that docker runs (docker ps), then rerun clear" >&2
  exit 1
fi

# halt if another live container still holds this port: it is not ours to remove
# .note = live only: a stopped container binds no port, so it blocks no `up`
if ! HOLDER_ROWS="$(docker ps --filter "publish=$TESTDB_PORT" --format '{{.Names}}|{{.Label "com.docker.compose.project"}}|{{.Label "com.docker.compose.project.working_dir"}}')"; then
  echo "💥 MalfunctionError: could not list the containers that hold port $TESTDB_PORT" >&2
  echo "   ├─ state: this checkout's own project is down; whether another holds the port is unknown" >&2
  echo "   └─ fix: check that docker runs (docker ps), then rerun clear" >&2
  exit 1
fi

# name each holder; a holder whose compose dir is this checkout's is its own testdb under an older project name
# .note = compose may record the dir with symlinks kept or resolved, so both forms count as this checkout's
SELF_DIR_REAL="$(cd "$SELF_DIR" && pwd -P)"
HOLDERS=""
HOLDERS_OWN=""
while IFS='|' read -r HOLDER_NAME HOLDER_PROJECT HOLDER_DIR; do
  if [[ -z "$HOLDER_NAME" ]]; then continue; fi
  HOLDER_LABEL="$HOLDER_NAME (project: $HOLDER_PROJECT)"
  if [[ -z "$HOLDER_PROJECT" ]]; then HOLDER_LABEL="$HOLDER_NAME (no compose project)"; fi
  HOLDERS="${HOLDERS:+$HOLDERS, }$HOLDER_LABEL"
  if [[ -n "$HOLDER_DIR" && ( "$HOLDER_DIR" == "$SELF_DIR" || "$HOLDER_DIR" == "$SELF_DIR_REAL" ) ]]; then HOLDERS_OWN="${HOLDERS_OWN:+$HOLDERS_OWN }$HOLDER_NAME"; fi
done <<< "$HOLDER_ROWS"

if [[ -n "$HOLDERS" ]]; then
  echo "✋ ConstraintError: port $TESTDB_PORT is held by a container outside this checkout's compose project" >&2
  echo "   ├─ holder: $HOLDERS" >&2
  echo "   ├─ why: a clear downs only this checkout's compose project; it never evicts another container" >&2
  # one fix per cause, the nearest first; the copy-paste removal names only a holder this checkout's
  # compose dir created, so a neighbor's is never offered
  echo "   └─ fix" >&2
  if [[ -n "$HOLDERS_OWN" ]]; then
    echo "      ├─ this checkout's own testdb, under an older project name: docker rm -f $HOLDERS_OWN" >&2
  fi
  echo "      ├─ another worktree of this repo: stop that testdb from its own checkout" >&2
  echo "      └─ another repo: declare another port in config/test.json database.tunnel.local.port" >&2
  exit 2
fi
echo "ensured port $TESTDB_PORT is available 👍"
