#!/usr/bin/env bash
######################################################################
# serverless database capacity awaiter
#
# .what = wait for serverless database to wake from idle state
# .why  = prevent cicd test failures when database scales to zero
# .cost = free (connection attempts with no actual db operations)
######################################################################

set -euo pipefail

# global configuration
readonly VERBOSE=${VERBOSE:-0}
readonly DEFAULT_TIMEOUT=60
readonly CHECK_INTERVAL=5
readonly CONNECTION_TIMEOUT=3

# usage & help
_usage() {
  cat <<EOF
usage: $(basename "$0") --host <hostname> --port <port> [OPTIONS]

wait for serverless database to wake from idle state.

this tool repeatedly attempts to connect to a database endpoint until it
receives a response (even an authentication error), indicating the database
has successfully woken up from idle state.

required arguments:
  --host <hostname>       database hostname or ip address
  --port <port>          database port number

optional arguments:
  --timeout <seconds>    maximum time to wait in seconds (default: $DEFAULT_TIMEOUT)
  -v, --verbose          enable verbose output with detailed connection attempts
  -h, --help             display this help message

examples:
  $(basename "$0") --host db.example.com --port 5432
  $(basename "$0") --host db.example.com --port 5432 --timeout 120
  $(basename "$0") --host db.example.com --port 5432 -v

what this script does:
  1. attempts to ping the database host
  2. attempts to connect to the database port every ${CHECK_INTERVAL}s
  3. waits for any response (including "invalid credentials") instead of timeout
  4. exits successfully when database responds, indicating it's awake

exit codes:
  0  success: database is responding
  1  error: general failure (see error message)
  2  error: missing or invalid arguments
  3  error: host unreachable or connection timeout
EOF
  exit "${1:-0}"
}

######################################################################
# .what = output message to stdout
# .why  = provide consistent logging interface for user-facing messages
######################################################################
_log() {
  echo "$@"
}

######################################################################
# .what = output verbose diagnostic message when verbose mode enabled
# .why  = provide detailed debugging info without cluttering normal output
######################################################################
_log_verbose() {
  if [[ $VERBOSE -eq 1 ]]; then
    echo "[verbose] $@" >&2
  fi
}

######################################################################
# .what = output error message to stderr with visual indicator
# .why  = clearly distinguish errors from normal output for user attention
######################################################################
_log_error() {
  echo "🔥 error: $@" >&2
}

######################################################################
# .what = output formatted section header for major workflow steps
# .why  = improve readability by visually separating execution phases
######################################################################
_log_step() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "▶ $@"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

######################################################################
# .what = test if database port is reachable
# .why  = determine if database has woken up from idle state
# .note = uses bash tcp test to avoid postgresql-client dependency
# .note = any response (success or immediate rejection) means database is awake
# .note = timeout means database is still waking up
######################################################################
_test_database_connection() {
  local host="$1"
  local port="$2"

  _log_verbose "attempting connection to $host:$port with ${CONNECTION_TIMEOUT}s timeout..."

  # use bash built-in tcp test with timeout
  # capture exit code before any conditionals to avoid race condition
  timeout "$CONNECTION_TIMEOUT" bash -c "echo > /dev/tcp/$host/$port" 2>/dev/null
  local exit_code=$?

  # exit code 124 = timeout (database still asleep/waking)
  # any other exit code (0 = success, 1 = connection refused, etc.) = database is awake
  if [[ $exit_code -eq 124 ]]; then
    # timeout occurred - database not responding yet
    _log_verbose "connection timeout (database may be waking up)"
    return 1
  else
    # any other response means database is awake
    # exit 0 = tcp connection succeeded
    # exit 1 = connection refused (database listening but rejecting unauthorized connections)
    # both indicate the database has successfully woken from idle state
    if [[ $exit_code -eq 0 ]]; then
      _log_verbose "tcp connection successful (database is awake)"
    else
      _log_verbose "database responded with rejection (exit $exit_code) - database is awake"
    fi
    return 0
  fi
}

######################################################################
# .what = attempt to ping database host
# .why  = verify network connectivity before attempting database connections
######################################################################
_ping_host() {
  local host="$1"

  _log_verbose "pinging host: $host"

  # attempt to ping with 3 packets, 2 second timeout
  if ping -c 3 -W 2 "$host" >/dev/null 2>&1; then
    _log "✓ host $host is reachable via ping"
    return 0
  else
    _log "⚠ host $host did not respond to ping (this may be normal if icmp is blocked)"
    return 1
  fi
}

######################################################################
# main entry point
######################################################################

# parse arguments
HOST=""
PORT=""
TIMEOUT=$DEFAULT_TIMEOUT

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      HOST="$2"
      shift 2
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    --timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    -v|--verbose)
      VERBOSE=1
      shift
      ;;
    -h|--help|help)
      _usage 0
      ;;
    *)
      _log_error "unknown argument: $1"
      _usage 2
      ;;
  esac
done

# validate required arguments
if [[ -z "$HOST" ]]; then
  _log_error "missing required argument: --host"
  _usage 2
fi

if [[ -z "$PORT" ]]; then
  _log_error "missing required argument: --port"
  _usage 2
fi

# validate host format to prevent shell injection
# allow: alphanumeric, dots, hyphens, underscores (common in hostnames)
if ! [[ "$HOST" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  _log_error "invalid host format: $HOST"
  _log_error "  host must contain only alphanumeric characters, dots, hyphens, and underscores"
  exit 2
fi

# validate port is numeric and in valid range
if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
  _log_error "invalid port: $PORT (must be numeric)"
  exit 2
fi

if [[ $PORT -lt 1 || $PORT -gt 65535 ]]; then
  _log_error "invalid port: $PORT (must be between 1 and 65535)"
  exit 2
fi

# validate timeout is numeric and reasonable
if ! [[ "$TIMEOUT" =~ ^[0-9]+$ ]]; then
  _log_error "invalid timeout: $TIMEOUT (must be numeric)"
  exit 2
fi

_log_step "waiting for serverless database capacity"

_log "• target: $HOST:$PORT"
_log "• timeout: ${TIMEOUT}s"
_log "• check interval: ${CHECK_INTERVAL}s"
_log ""

# attempt to ping host
_log_step "test host reachability"
_ping_host "$HOST" || true  # don't fail if ping fails
_log ""

# wait for database to respond
_log_step "await database response"
_log "attempting to connect every ${CHECK_INTERVAL}s (max ${TIMEOUT}s)..."
_log ""

elapsed=0
attempt=1

while [[ $elapsed -lt $TIMEOUT ]]; do
  _log "  ‣ attempt $attempt (${elapsed}s elapsed)..."

  if _test_database_connection "$HOST" "$PORT"; then
    _log ""
    _log "✨ database is responding (port is reachable)"
    _log "• database has successfully woken from idle state"
    _log "• took ${elapsed}s to receive response"
    _log ""
    exit 0
  fi

  # wait before next attempt
  sleep $CHECK_INTERVAL
  elapsed=$((elapsed + CHECK_INTERVAL))
  attempt=$((attempt + 1))
done

# timeout reached
_log ""
_log_error "timeout reached after ${TIMEOUT}s"
_log_error "  database did not respond within the timeout period"
_log_error "  the database may still be waking up or may be unreachable"
_log_error ""
_log_error "troubleshooting:"
_log_error "  - verify host is correct: $HOST"
_log_error "  - verify port is correct: $PORT"
_log_error "  - check network connectivity to the database"
_log_error "  - try increasing timeout with --timeout <seconds>"
_log_error "  - check if database is accessible from this network"
exit 3
