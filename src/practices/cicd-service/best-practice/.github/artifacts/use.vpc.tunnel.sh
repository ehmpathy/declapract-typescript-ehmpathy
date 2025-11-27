#!/usr/bin/env bash
######################################################################
# use.vpc.tunnel connection manager
#
# .what = establish ssm port forwarding to rds via bastion host
# .why  = replace $300/mo vpc+vpn with $4/mo ec2 bastion solution
# .cost = free (aws api calls) + bastion ec2 runtime (~$1-4/mo)
######################################################################

set -euo pipefail

# disable AWS CLI pager for all commands
export AWS_PAGER=""

# global configuration
readonly VERBOSE=${VERBOSE:-0}
readonly BASTION_TAG_KEY="VpcProxyAccess"
readonly BASTION_TAG_VALUE="ahbodedb"
readonly MAX_START_WAIT=180
readonly MAX_SSM_WAIT=60
readonly DB_TEST_TIMEOUT=${DB_TEST_TIMEOUT:-10}

# daemon mode flag
DAEMON_MODE=0
# cleanup mode flag
CLEANUP_MODE=0
# dependency installation flag
INSTALL_DEPS=0
# on-fail-logdump flag (not readonly - can be set via CLI)
ON_FAIL_LOGDUMP=${ON_FAIL_LOGDUMP:-0}
# note: actual daemon file paths are set after port configuration
# to ensure they're port-specific (allows parallel prep/prod tunnels)
DAEMON_PID_FILE=""
DAEMON_INFO_FILE=""

# aws account id mappings for env.access detection
readonly AWS_ACCOUNT_ID_PREP="874711128849"
readonly AWS_ACCOUNT_ID_PROD="398838478359"

# ports will be set based on env.access (no overrides allowed)
LOCAL_PORT=""
REMOTE_PORT=""

# usage & help
_usage() {
  cat <<EOF
usage: $(basename "$0") [OPTIONS]

establish secure ssm tunnel to database via use.vpc.tunnel bastion.
replaces expensive vpn solution with lightweight bastion host approach.

automatically detects env.access (prep/prod) based on AWS account ID.
different local ports allow simultaneous connections to prep and prod:
  - prep: local port 15432 → remote port 5432
  - prod: local port 15433 → remote port 5432

options:
  -d, --daemon              run in daemon mode (background, exits after setup)
  -c, --cleanup             cleanup all running tunnel processes and files
  --with-deps-install       install required dependencies (jq, session-manager-plugin)
  -v, --verbose             enable verbose output with detailed aws cli commands
  --on-fail-logdump         dump all log files (ssm + connection checks) on failure
  -h, --help                display this help message

examples:
  $(basename "$0")                        # establish tunnel (interactive)
  $(basename "$0") --daemon               # establish tunnel (background/ci mode)
  $(basename "$0") --cleanup              # cleanup all running tunnels
  $(basename "$0") --with-deps-install    # install dependencies and establish tunnel
  $(basename "$0") -v                     # verbose mode for debugging

configuration (via env vars):
  AWS_REGION           aws region to use (default: from profile or us-east-1)
  VERBOSE              enable verbose mode (1 or 0, default: 0)
  SHOW_FULL_SSM_LOG    show full ssm log on failure (1 or 0, default: 0)

port assignment:
  ports are automatically assigned based on env.access level
  prep: local port 15432 → remote port 5432
  prod: local port 15433 → remote port 5432
  (port overrides are not allowed to ensure parallel connections work correctly)

what this script does:
  1. detects env.access level from AWS account ID
  2. finds the bastion instance for current AWS account
  3. ensures bastion is running (starts if stopped)
  4. establishes ssm port forwarding tunnel
  5. verifies database port is reachable
  6. keeps tunnel active until ctrl+c

database access:
  this script only establishes the tunnel. manage database credentials separately.

  connect using psql:
    psql -h <hostname> -p $LOCAL_PORT -U <your-username> -d postgres

  or use your preferred database tool (dbeaver, datagrip, beekeeper, etc.)

requirements:
  - aws cli configured with valid credentials
  - iam permissions for ssm:StartSession, ec2:StartInstances, ec2:DescribeInstances
  - session-manager-plugin installed for aws cli
  - bastion instance provisioned via terraform

exit codes:
  0  success: tunnel established and port reachable
  1  error: general failure (see error message)
  2  error: missing or invalid arguments
  3  error: missing dependencies or aws api error
  4  error: bastion not found or cannot be started
  5  error: port reachability test failed
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
# .what = install required dependencies (jq and session-manager-plugin)
# .why  = enable automated dependency installation for ci/cd environments
######################################################################
_install_deps() {
  _log_step "install dependencies"

  # install jq for json parsing
  if ! command -v jq &>/dev/null; then
    _log "• installing jq..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
      sudo apt-get update -qq
      sudo apt-get install -y jq
    elif [[ "$OSTYPE" == "darwin"* ]]; then
      brew install jq
    else
      _log_error "unsupported platform for automatic jq installation: $OSTYPE"
      _log_error "  please install jq manually"
      exit 3
    fi
    _log "✓ jq installed: $(jq --version)"
  else
    _log "✓ jq already installed: $(jq --version)"
  fi

  # install session-manager-plugin
  if ! command -v session-manager-plugin &>/dev/null; then
    _log "• installing session-manager-plugin..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
      curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o "/tmp/session-manager-plugin.deb"
      sudo dpkg -i /tmp/session-manager-plugin.deb
    elif [[ "$OSTYPE" == "darwin"* ]]; then
      curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac/sessionmanager-bundle.zip" -o "/tmp/sessionmanager-bundle.zip"
      unzip -q /tmp/sessionmanager-bundle.zip
      sudo ./sessionmanager-bundle/install -i /usr/local/sessionmanagerplugin -b /usr/local/bin/session-manager-plugin
      rm -rf ./sessionmanager-bundle /tmp/sessionmanager-bundle.zip
    else
      _log_error "unsupported platform for automatic session-manager-plugin installation: $OSTYPE"
      _log_error "  visit: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html"
      exit 3
    fi
    _log "✓ AWS SSM Session Manager Plugin installed successfully"
    session-manager-plugin --version
  else
    _log "✓ session-manager-plugin already installed"
    session-manager-plugin --version
  fi
}

######################################################################
# .what = verify required system tools are installed
# .why  = fail fast before attempting operations if dependencies missing
######################################################################
_check_deps() {
  local missing=0

  if ! command -v aws &>/dev/null; then
    _log_error "aws cli not found; install aws cli first"
    _log_error "  visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    missing=1
  fi

  if ! command -v jq &>/dev/null; then
    _log_error "jq not found; install jq for json processing"
    _log_error "  ubuntu/debian: sudo apt-get install jq"
    _log_error "  macos: brew install jq"
    missing=1
  fi

  if ! command -v session-manager-plugin &>/dev/null; then
    _log_error "session-manager-plugin not found; install plugin first"
    _log_error "  ubuntu/debian:"
    _log_error "    curl \"https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb\" -o \"/tmp/session-manager-plugin.deb\""
    _log_error "    sudo dpkg -i /tmp/session-manager-plugin.deb"
    _log_error "  macos:"
    _log_error "    curl \"https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac/sessionmanager-bundle.zip\" -o \"/tmp/sessionmanager-bundle.zip\""
    _log_error "    unzip /tmp/sessionmanager-bundle.zip && sudo ./sessionmanager-bundle/install -i /usr/local/sessionmanagerplugin -b /usr/local/bin/session-manager-plugin"
    _log_error "  other platforms: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html"
    missing=1
  fi

  if [[ $missing -eq 1 ]]; then
    exit 3
  fi
}

######################################################################
# .what = validate aws credentials are configured and working
# .why  = fail early with helpful message if authentication not setup
######################################################################
_check_aws_auth() {
  _log_verbose "checking aws credentials..."

  if [[ -n "${AWS_PROFILE:-}" ]]; then
    _log_verbose "using AWS_PROFILE: $AWS_PROFILE"
  fi

  local caller_identity
  if ! caller_identity=$(aws sts get-caller-identity 2>&1); then
    _log_error "aws credentials not configured or expired"
    _log_error "  configure aws cli: aws configure"
    _log_error ""
    _log_error "aws error: $caller_identity"
    exit 3
  fi

  _log_verbose "authenticated as: $(echo "$caller_identity" | grep -o '"Arn": "[^"]*"' | cut -d'"' -f4)"

  # return account id for cluster resolution
  echo "$caller_identity" | grep -o '"Account": "[^"]*"' | cut -d'"' -f4
}

######################################################################
# .what = terminate a single tunnel session
# .why  = DRY - single cleanup function used by both interactive and daemon modes
# usage: _cleanup_tunnel pid=<pid> session_id=<session_id> info_file=<path>
######################################################################
_cleanup_tunnel() {
  local pid=""
  local session_id=""
  local info_file=""

  # parse named arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      pid=*)
        pid="${1#*=}"
        shift
        ;;
      session_id=*)
        session_id="${1#*=}"
        shift
        ;;
      info_file=*)
        info_file="${1#*=}"
        shift
        ;;
      *)
        shift
        ;;
    esac
  done

  # if session_id not provided, try to get it from info file
  if [[ -z "$session_id" ]] && [[ -n "$info_file" ]] && [[ -f "$info_file" ]]; then
    session_id=$(jq -r '.session_id // empty' "$info_file" 2>/dev/null || echo "")
  fi

  # terminate SSM session if we have a session ID
  if [[ -n "$session_id" ]]; then
    _log_verbose "terminating SSM session: $session_id"
    aws ssm terminate-session --session-id "$session_id" 2>/dev/null || _log_verbose "failed to terminate session (may already be terminated)"
  fi

  # kill the local process if we have a PID
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    sleep 1

    # force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
      _log_verbose "force killing process $pid"
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi
}

######################################################################
# .what = cleanup all running tunnel processes and related files
# .why  = provide centralized cleanup for ci/cd and manual cleanup needs
######################################################################
_cleanup_all_tunnels() {
  _log_step "cleanup vpc tunnels"

  local cleaned_count=0
  local files_removed=0

  # find and terminate all tunnel sessions
  _log "• checking for running tunnel processes..."
  for pid_file in /tmp/vpc-tunnel-*.pid; do
    if [[ -f "$pid_file" ]]; then
      local pid
      pid=$(cat "$pid_file" 2>/dev/null || echo "")

      if [[ -n "$pid" ]]; then
        if kill -0 "$pid" 2>/dev/null; then
          _log "  ‣ terminating tunnel session (pid: $pid) from $pid_file"

          local info_file="${pid_file%.pid}-info.json"
          _cleanup_tunnel pid="$pid" info_file="$info_file"

          cleaned_count=$((cleaned_count + 1))
        else
          _log_verbose "  ‣ stale pid file: $pid_file (process $pid not running)"
        fi
      fi
    fi
  done

  # cleanup all tunnel-related files
  _log "• cleaning up tunnel files..."

  # collect all files to remove (including both .log and .checks.log files)
  local files_to_remove=()
  for pattern in /tmp/vpc-tunnel-*.pid /tmp/vpc-tunnel-*-info.json /tmp/vpc-tunnel-info.*.i*.log /tmp/vpc-tunnel-info.*.i*.checks.log; do
    if compgen -G "$pattern" > /dev/null 2>&1; then
      while IFS= read -r file; do
        files_to_remove+=("$file")
      done < <(ls -1 $pattern 2>/dev/null)
    fi
  done

  # enumerate and remove files
  if [[ ${#files_to_remove[@]} -gt 0 ]]; then
    for file in "${files_to_remove[@]}"; do
      _log "  ‣ removing: $file"
      rm -f "$file" 2>/dev/null || true
    done
    files_removed=${#files_to_remove[@]}
  fi

  _log ""
  if [[ $cleaned_count -gt 0 ]] || [[ $files_removed -gt 0 ]]; then
    _log "✨ cleanup complete"
    [[ $cleaned_count -gt 0 ]] && _log "  ‣ stopped $cleaned_count tunnel process(es)"
    [[ $files_removed -gt 0 ]] && _log "  ‣ removed $files_removed file(s)"
  else
    _log "✓ no tunnels found to cleanup"
  fi
  _log ""
}

######################################################################
# .what = display comprehensive list of required iam permissions
# .why  = help users and administrators understand permission requirements
######################################################################
_show_required_iam_permissions() {
  _log ""
  _log "required iam permissions for use.vpc.tunnel bastion:"
  _log ""
  _log "ec2 permissions:"
  _log "  - ec2:DescribeInstances"
  _log "  - ec2:StartInstances"
  _log ""
  _log "ssm permissions:"
  _log "  - ssm:StartSession"
  _log "  - ssm:DescribeInstanceInformation"
  _log ""
  _log "rds permissions:"
  _log "  - rds:DescribeDBClusters"
  _log ""
  _log "contact your administrator to attach these policies to your iam user/role"
}

######################################################################
# .what = detect env.access level from aws account id
# .why  = enable env-specific configuration for prep vs prod access
######################################################################
_get_env_access() {
  local account_id="$1"

  _log_verbose "detecting env.access for AWS account"

  # map account id to env.access level
  case "$account_id" in
    "$AWS_ACCOUNT_ID_PREP")
      echo "prep"
      return 0
      ;;
    "$AWS_ACCOUNT_ID_PROD")
      echo "prod"
      return 0
      ;;
    *)
      _log_error "unknown AWS account"
      _log_error "  expected prep or prod account"
      exit 3
      ;;
  esac
}

######################################################################
# .what = resolve rds cluster identifier from env.access
# .why  = return correct cluster id for the current env.access
######################################################################
_get_cluster_id() {
  local env_access="$1"

  _log_verbose "resolving cluster id for env_access: $env_access"

  # map env_access to cluster id
  case "$env_access" in
    prep|prod)
      echo "ahbodedb"
      return 0
      ;;
    *)
      _log_error "invalid env_access: $env_access"
      exit 3
      ;;
  esac
}

######################################################################
# .what = configure env-specific port settings
# .why  = use different local ports for prep/prod to allow parallel connections
# .note = outputs "LOCAL_PORT:REMOTE_PORT" for parsing
######################################################################
_configure_ports() {
  local env_access="$1"

  _log_verbose "configuring port settings for env_access: $env_access"

  # configure env-specific port settings
  # different local ports allow simultaneous prep and prod connections
  case "$env_access" in
    prep)
      # prep: local port 15432, remote port 5432
      echo "15432:5432"
      ;;
    prod)
      # production: local port 15433, remote port 5432
      echo "15433:5432"
      ;;
    *)
      _log_error "invalid env_access: $env_access"
      exit 3
      ;;
  esac
}

######################################################################
# .what = locate bastion ec2 instance using resource tags
# .why  = dynamically discover bastion without hardcoding instance ids
######################################################################
_find_bastion() {
  local cluster_id="$1"
  _log_verbose "searching for bastion instance with tags: $BASTION_TAG_KEY=$BASTION_TAG_VALUE"

  _log_verbose "executing: aws ec2 describe-instances --filters Name=tag:$BASTION_TAG_KEY,Values=$BASTION_TAG_VALUE Name=instance-state-name,Values=running,stopped,stopping"

  local instance_json
  if ! instance_json=$(aws ec2 describe-instances \
    --filters \
      "Name=tag:$BASTION_TAG_KEY,Values=$BASTION_TAG_VALUE" \
      "Name=instance-state-name,Values=running,stopped,stopping" \
    --query 'Reservations[0].Instances[0]' \
    --output json 2>&1); then
    _log_error "failed to query ec2 instances"
    _log_error "  $instance_json"
    _show_required_iam_permissions
    exit 3
  fi

  # verify uniqueness by counting total matching instances
  _log_verbose "verifying instance uniqueness..."
  local all_instance_ids
  if ! all_instance_ids=$(aws ec2 describe-instances \
    --filters \
      "Name=tag:$BASTION_TAG_KEY,Values=$BASTION_TAG_VALUE" \
      "Name=instance-state-name,Values=running,stopped,stopping" \
    --query 'Reservations[*].Instances[*].InstanceId' \
    --output text 2>&1); then
    _log_verbose "failed to verify uniqueness, proceeding with first match"
  else
    local instance_count
    instance_count=$(echo "$all_instance_ids" | wc -w)
    _log_verbose "found $instance_count matching instance(s)"

    # reject if multiple instances found
    if [[ $instance_count -gt 1 ]]; then
      _log_error "multiple bastion instances found with tags: $BASTION_TAG_KEY=$BASTION_TAG_VALUE"
      _log_error "  found $instance_count instances: $all_instance_ids"
      _log_error ""
      _log_error "ensure only one bastion instance has these tags"
      _log_error "  review instances and remove duplicate tags"
      exit 4
    fi
  fi

  local instance_id
  instance_id=$(echo "$instance_json" | jq -r '.InstanceId // empty' 2>/dev/null)

  if [[ -z "$instance_id" || "$instance_id" == "None" ]]; then
    _log_error "bastion instance not found for cluster: $cluster_id"
    _log_error "  searched for tags: $BASTION_TAG_KEY=$BASTION_TAG_VALUE"
    _log_error ""
    _log_error "provision bastion via terraform first:"
    _log_error "  cd terraform/product"
    _log_error "  terraform apply -target=module.use.vpc.tunnel_bastion"
    exit 4
  fi

  echo "$instance_json"
}

######################################################################
# .what = start bastion instance if stopped and wait until ready
# .why  = ensure bastion is operational before attempting connection
# .note = blocks until ssm agent reports online status
######################################################################
_ensure_bastion_running() {
  local instance_json="$1"

  # extract instance metadata
  local instance_id
  local instance_state
  instance_id=$(echo "$instance_json" | jq -r '.InstanceId // empty')
  instance_state=$(echo "$instance_json" | jq -r '.State.Name // empty')

  _log "• instance state: $instance_state"

  # reject if stopping
  if [[ "$instance_state" == "stopping" ]]; then
    _log_error "bastion is currently stopping"
    _log_error "  wait for it to reach stopped state, then try again"
    exit 4
  fi

  # start instance if stopped
  if [[ "$instance_state" == "stopped" ]]; then
    # start stopped instance
    _log "bastion is stopped, starting instance..."

    _log_verbose "executing: aws ec2 start-instances --instance-ids $instance_id"

    if ! aws ec2 start-instances --instance-ids "$instance_id" >/dev/null 2>&1; then
      _log_error "failed to start bastion instance $instance_id"
      _log_error "  check iam permissions: ec2:StartInstances"
      _show_required_iam_permissions
      exit 4
    fi

    # wait for instance to reach running state
    _log "waiting for instance to reach running state (max ${MAX_START_WAIT}s)..."
    _log_verbose "polling instance state every 5 seconds..."
    local elapsed=0
    while [[ $elapsed -lt $MAX_START_WAIT ]]; do
      _log_verbose "executing: aws ec2 describe-instances --instance-ids $instance_id --query 'Reservations[0].Instances[0].State.Name' --output text"
      local current_state
      current_state=$(aws ec2 describe-instances \
        --instance-ids "$instance_id" \
        --query 'Reservations[0].Instances[0].State.Name' \
        --output text 2>/dev/null)

      if [[ "$current_state" == "running" ]]; then
        _log "✨ bastion is now running"
        break
      fi

      echo -n "."
      sleep 5
      elapsed=$((elapsed + 5))
    done
    echo ""

    # reject if timeout waiting for running state
    if [[ $elapsed -ge $MAX_START_WAIT ]]; then
      _log_error "timeout waiting for bastion to start"
      exit 4
    fi
  elif [[ "$instance_state" == "running" ]]; then
    _log "✨ bastion instance is running"
  else
    # reject if unexpected state
    _log_error "bastion is in unexpected state: $instance_state"
    exit 4
  fi

  # always verify ssm agent is ready (even if instance was already running)
  # this handles cases where instance just started or ssm agent is still initializing
  _log "verifying ssm agent is ready (max ${MAX_SSM_WAIT}s)..."
  _log_verbose "polling ssm agent status every 3 seconds..."
  local elapsed=0
  while [[ $elapsed -lt $MAX_SSM_WAIT ]]; do
    _log_verbose "executing: aws ssm describe-instance-information --filters Key=InstanceIds,Values=$instance_id --query 'InstanceInformationList[0].PingStatus' --output text"
    if aws ssm describe-instance-information \
      --filters "Key=InstanceIds,Values=$instance_id" \
      --query 'InstanceInformationList[0].PingStatus' \
      --output text 2>/dev/null | grep -q "Online"; then
      _log "✨ ssm agent ready"
      return 0
    fi

    echo -n "."
    sleep 3
    elapsed=$((elapsed + 3))
  done
  echo ""

  # reject if timeout waiting for ssm agent
  _log_error "timeout waiting for ssm agent to be ready"
  _log_error "  bastion may need more time to initialize"
  _log_error "  try running the command again in a few moments"
  exit 4
}

######################################################################
# .what = retrieve rds cluster endpoint hostname from aws api
# .why  = obtain current endpoint for port forwarding target
######################################################################
_get_rds_endpoint() {
  local cluster_id="$1"
  _log_verbose "retrieving rds endpoint for cluster: $cluster_id"

  _log_verbose "executing: aws rds describe-db-clusters --db-cluster-identifier $cluster_id --query 'DBClusters[0].Endpoint' --output text"

  local endpoint
  if ! endpoint=$(aws rds describe-db-clusters \
    --db-cluster-identifier "$cluster_id" \
    --query 'DBClusters[0].Endpoint' \
    --output text 2>&1); then
    _log_error "failed to retrieve rds endpoint for cluster: $cluster_id"
    _log_error "  $endpoint"
    _show_required_iam_permissions
    exit 3
  fi

  if [[ -z "$endpoint" || "$endpoint" == "None" ]]; then
    _log_error "cluster $cluster_id has no endpoint"
    exit 3
  fi

  echo "$endpoint"
}


######################################################################
# .what = add local dns entry mapping cluster to localhost
# .why  = enable friendly hostnames for database connections
# .note = requires sudo to modify /etc/hosts; idempotent on re-run
######################################################################
_setup_local_dns() {
  local cluster_id="$1"
  local env_access="$2"
  local dns_name="aws.ssmproxy.${cluster_id}.${env_access}"

  _log_verbose "setting up local dns: $dns_name -> localhost"

  # validate dns name format
  if ! [[ "$dns_name" =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ ]]; then
    _log_error "invalid dns name format: $dns_name"
    exit 3
  fi

  # check if we need sudo for /etc/hosts
  if [[ ! -w /etc/hosts ]]; then
    _log "note: dns setup requires sudo access to modify /etc/hosts"
    _log "  you may be prompted for your password"
    _log_verbose "checking write permissions on /etc/hosts"
  fi

  # check if entry already exists with exact match
  _log_verbose "checking if dns entry already exists in /etc/hosts"
  if grep -E "^127\.0\.0\.1[[:space:]]+$dns_name([[:space:]]|$)" /etc/hosts >/dev/null 2>&1; then
    _log_verbose "dns entry already exists in /etc/hosts, skipping"
  else
    # create timestamped backup before any modifications
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="/etc/hosts.bak.$timestamp"
    _log_verbose "creating backup: $backup_file"

    if ! sudo cp /etc/hosts "$backup_file" 2>/dev/null; then
      _log_error "failed to create backup of /etc/hosts"
      _log_error "  cannot proceed without backup"
      exit 3
    fi

    _log_verbose "backup created successfully: $backup_file"

    # remove any conflicting entries for this dns name
    _log_verbose "checking for conflicting dns entries"
    if grep -q "[[:space:]]$dns_name([[:space:]]|$)" /etc/hosts 2>/dev/null; then
      _log_verbose "removing conflicting dns entry for $dns_name"
      sudo sed -i "/[[:space:]]$dns_name\([[:space:]]\|$\)/d" /etc/hosts 2>/dev/null || true
    fi

    # add entry to /etc/hosts
    local dns_entry="127.0.0.1 $dns_name  # vpc proxy for $cluster_id"
    _log_verbose "adding dns entry to /etc/hosts: $dns_entry"
    _log_verbose "executing: echo \"$dns_entry\" | sudo tee -a /etc/hosts"

    if echo "$dns_entry" | sudo tee -a /etc/hosts >/dev/null; then
      _log "• added local dns: $dns_name → localhost"
      _log_verbose "dns entry successfully added"
      _log_verbose "backup available at: $backup_file"
    else
      _log_error "failed to add dns record to /etc/hosts"
      _log_error "  sudo access is required to modify /etc/hosts"
      _log_error "  backup available at: $backup_file"
      exit 3
    fi
  fi

  echo "$dns_name"
}

######################################################################
# .what = wait for tunnel to stabilize and accept connections
# .why  = shared waiting logic for retry mechanism
# .note = returns 0 if ready, 1 if timeout/failure
# .note = optional fail_on_error param - if true, exits on failure
# usage: _wait_for_tunnel_stabilized timeout=60 fail_on_error=false ssm_log_file=/path/to/log connection_log_file=/path/to/checks
######################################################################
_wait_for_tunnel_stabilized() {
  # parse named arguments
  local max_stabilize_wait=""
  local fail_on_error="false"
  local ssm_log_file=""
  local connection_log_file=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      timeout=*)
        max_stabilize_wait="${1#*=}"
        shift
        ;;
      fail_on_error=*)
        fail_on_error="${1#*=}"
        shift
        ;;
      ssm_log_file=*)
        ssm_log_file="${1#*=}"
        shift
        ;;
      connection_log_file=*)
        connection_log_file="${1#*=}"
        shift
        ;;
      *)
        shift
        ;;
    esac
  done

  # validate required parameters
  if [[ -z "$max_stabilize_wait" ]]; then
    _log_error "missing required parameter: timeout"
    exit 3
  fi

  _log "• waiting for tunnel to accept connections (checking every 2s, max ${max_stabilize_wait}s)..."
  local stabilize_wait=0
  local check_interval=2

  while [[ $stabilize_wait -lt $max_stabilize_wait ]]; do
    # log connection check timestamp to the connection log file
    if [[ -n "$connection_log_file" ]]; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] checking tunnel connection (elapsed: ${stabilize_wait}s)" >> "$connection_log_file" 2>/dev/null || true
    fi

    # verify the process is still running
    if ! kill -0 "$PORT_FORWARD_PID" 2>/dev/null; then
      if [[ -n "$connection_log_file" ]]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] tunnel process died during initialization" >> "$connection_log_file" 2>/dev/null || true
      fi
      if [[ "$fail_on_error" == "true" ]]; then
        _log_error "ssm tunnel process died during initialization"
        _log_error "  check aws ssm permissions and session-manager-plugin installation"
        exit 3
      else
        _log_verbose "ssm tunnel process died during initialization"
        return 1
      fi
    fi

    # check if port accepts connections
    if timeout 2 bash -c "echo > /dev/tcp/localhost/$LOCAL_PORT" 2>/dev/null; then
      if [[ -n "$connection_log_file" ]]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ tunnel is ready and accepting connections (took ${stabilize_wait}s)" >> "$connection_log_file" 2>/dev/null || true
      fi
      _log "• tunnel is ready and accepting connections (took ${stabilize_wait}s)"
      return 0
    fi

    # show progress every 5 seconds
    if [[ $((stabilize_wait % 5)) -eq 0 ]] && [[ $stabilize_wait -gt 0 ]]; then
      _log "  ‣ still waiting... (${stabilize_wait}s elapsed)"
    fi

    sleep $check_interval
    stabilize_wait=$((stabilize_wait + check_interval))
  done

  # timeout reached
  if [[ "$fail_on_error" == "true" ]]; then
    # in fail_on_error mode, warn but continue (original behavior)
    if [[ $stabilize_wait -ge $max_stabilize_wait ]]; then
      _log "⚠ tunnel process is running but not yet accepting connections"
      _log "  continuing anyway - the reachability test will verify if it works"
      _log ""

      # show log content based on flags
      if [[ $ON_FAIL_LOGDUMP -eq 1 ]]; then
        # dump all log files when --on-fail-logdump is enabled
        _log "📋 dumping all log files:"
        _log ""

        # dump ssm session log
        if [[ -f "$ssm_log_file" ]] && [[ -s "$ssm_log_file" ]]; then
          _log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          _log "SSM SESSION LOG: $ssm_log_file"
          _log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          cat "$ssm_log_file" | while IFS= read -r line; do
            _log "$line"
          done
          _log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          _log ""
        else
          _log "📋 SSM session log ($ssm_log_file): empty or not found"
          _log ""
        fi

        # dump connection checks log
        if [[ -f "$connection_log_file" ]] && [[ -s "$connection_log_file" ]]; then
          _log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          _log "CONNECTION CHECKS LOG: $connection_log_file"
          _log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          cat "$connection_log_file" | while IFS= read -r line; do
            _log "$line"
          done
          _log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          _log ""
        else
          _log "📋 Connection checks log ($connection_log_file): empty or not found"
          _log ""
        fi
      else
        # show abbreviated logs without --on-fail-logdump
        _log "📋 ssm session log: $ssm_log_file"
        if [[ -f "$ssm_log_file" ]] && [[ -s "$ssm_log_file" ]]; then
          _log ""
          _log "last 10 lines from ssm session output (use --on-fail-logdump for full log):"
          tail -10 "$ssm_log_file" | while IFS= read -r line; do
            _log "  $line"
          done
          _log ""
        else
          _log "  (ssm log file is empty or not found)"
          _log ""
        fi

        _log "📋 connection checks log: $connection_log_file"
        if [[ -f "$connection_log_file" ]] && [[ -s "$connection_log_file" ]]; then
          _log ""
          _log "last 10 lines from connection checks (use --on-fail-logdump for full log):"
          tail -10 "$connection_log_file" | while IFS= read -r line; do
            _log "  $line"
          done
          _log ""
        else
          _log "  (connection checks log is empty or not found)"
          _log ""
        fi
      fi
    fi
    return 0
  else
    # in retry mode, kill the slow process and return failure
    _log_verbose "timeout after ${max_stabilize_wait}s waiting for tunnel to accept connections"
    _log_verbose "ssm session log: $ssm_log_file"

    # show ssm log snippet if verbose mode
    if [[ $VERBOSE -eq 1 ]] && [[ -f "$ssm_log_file" ]] && [[ -s "$ssm_log_file" ]]; then
      _log_verbose "ssm session output (last 5 lines):"
      tail -5 "$ssm_log_file" | while IFS= read -r line; do
        _log_verbose "  $line"
      done
    fi

    if [[ -n "$PORT_FORWARD_PID" ]] && kill -0 "$PORT_FORWARD_PID" 2>/dev/null; then
      _log_verbose "killing slow tunnel process (pid: $PORT_FORWARD_PID)"
      kill "$PORT_FORWARD_PID" 2>/dev/null || true
      wait "$PORT_FORWARD_PID" 2>/dev/null || true
    fi
    return 1
  fi
}

######################################################################
# .what = internal helper to establish ssm tunnel with timeout
# .why  = shared logic for retry mechanism
# .note = returns 0 on success, 1 on failure/timeout (or exits if fail_on_error=true)
# .note = kills slow processes on timeout (unless fail_on_error=true)
# usage: _try_start_port_forwarding instance_id=i-xxx rds_endpoint=xxx.rds.amazonaws.com timeout=30 fail_on_error=false attempt=1
######################################################################
_try_start_port_forwarding() {
  # parse named arguments
  local instance_id=""
  local rds_endpoint=""
  local max_stabilize_wait=""
  local fail_on_error="false"
  local attempt="1"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      instance_id=*)
        instance_id="${1#*=}"
        shift
        ;;
      rds_endpoint=*)
        rds_endpoint="${1#*=}"
        shift
        ;;
      timeout=*)
        max_stabilize_wait="${1#*=}"
        shift
        ;;
      fail_on_error=*)
        fail_on_error="${1#*=}"
        shift
        ;;
      attempt=*)
        attempt="${1#*=}"
        shift
        ;;
      *)
        shift
        ;;
    esac
  done

  # validate required parameters
  if [[ -z "$instance_id" ]] || [[ -z "$rds_endpoint" ]] || [[ -z "$max_stabilize_wait" ]]; then
    _log_error "missing required parameters: instance_id, rds_endpoint, timeout"
    exit 3
  fi

  _log "• starting ssm tunnel in background..."
  _log_verbose "executing: aws ssm start-session --target $instance_id --document-name AWS-StartPortForwardingSessionToRemoteHost"
  _log_verbose "  parameters: host=$rds_endpoint, portNumber=$REMOTE_PORT, localPortNumber=$LOCAL_PORT"

  # create separate log files for ssm output and connection checks
  local ssm_log_file="/tmp/vpc-tunnel-info.${LOCAL_PORT}.i${attempt}.log"
  local connection_log_file="/tmp/vpc-tunnel-info.${LOCAL_PORT}.i${attempt}.checks.log"

  # truncate log files at start (fresh run)
  > "$ssm_log_file"
  > "$connection_log_file"

  _log "  ‣ ssm output logging to: $ssm_log_file"
  _log "  ‣ connection checks logging to: $connection_log_file"

  # start ssm session in background (always log to file)
  aws ssm start-session \
    --target "$instance_id" \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters "{\"host\":[\"$rds_endpoint\"],\"portNumber\":[\"$REMOTE_PORT\"],\"localPortNumber\":[\"$LOCAL_PORT\"]}" \
    --debug \
    >"$ssm_log_file" 2>&1 &
  PORT_FORWARD_PID=$!

  # verify port forwarding process started
  if [[ -z "$PORT_FORWARD_PID" ]]; then
    if [[ "$fail_on_error" == "true" ]]; then
      _log_error "failed to start port forwarding process"
      exit 3
    else
      _log_verbose "failed to start port forwarding process"
      return 1
    fi
  fi

  _log "• ssm tunnel started (pid: $PORT_FORWARD_PID)"

  # wait a moment for the session ID to appear in the log
  sleep 2

  # extract session ID from the log file and make it globally available
  SSM_SESSION_ID=$(grep -oP 'SessionId:\s*\K[a-zA-Z0-9_-]+' "$ssm_log_file" 2>/dev/null | head -1 || echo "")
  if [[ -n "$SSM_SESSION_ID" ]]; then
    _log_verbose "SSM session ID: $SSM_SESSION_ID"
  else
    _log_verbose "could not extract session ID from log (will retry later)"
  fi

  # wait for tunnel to stabilize
  _wait_for_tunnel_stabilized timeout="$max_stabilize_wait" fail_on_error="$fail_on_error" ssm_log_file="$ssm_log_file" connection_log_file="$connection_log_file"
}

######################################################################
# .what = establish ssm port forwarding with single attempt and long timeout
# .why  = logs show the original connection resolves, just takes longer than short timeouts
# .note = single attempt with 150s timeout - observed connections resolve around 30-60s
# .note = sets global PORT_FORWARD_PID variable with the process id
# usage: _start_port_forwarding_with_retry instance_id=i-xxx rds_endpoint=xxx.rds.amazonaws.com
######################################################################
_start_port_forwarding_with_retry() {
  # parse named arguments
  local instance_id=""
  local rds_endpoint=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      instance_id=*)
        instance_id="${1#*=}"
        shift
        ;;
      rds_endpoint=*)
        rds_endpoint="${1#*=}"
        shift
        ;;
      *)
        shift
        ;;
    esac
  done

  # validate required parameters
  if [[ -z "$instance_id" ]] || [[ -z "$rds_endpoint" ]]; then
    _log_error "missing required parameters: instance_id, rds_endpoint"
    exit 3
  fi

  # clean up any existing processes on this port
  local existing_pids
  existing_pids=$(lsof -ti :$LOCAL_PORT 2>/dev/null || true)
  if [[ -n "$existing_pids" ]]; then
    _log_verbose "cleaning up existing processes on port $LOCAL_PORT: $existing_pids"
    for pid in $existing_pids; do
      kill "$pid" 2>/dev/null || true
    done
    sleep 1
  fi

  # single attempt with 150s timeout (connections typically resolve in 30-60s)
  _log_verbose "starting port forwarding with 150s timeout"
  _try_start_port_forwarding \
    instance_id="$instance_id" \
    rds_endpoint="$rds_endpoint" \
    timeout=150 \
    attempt=1 \
    fail_on_error=true
}

######################################################################
# .what = verify database port is reachable through tunnel
# .why  = confirm ssm tunnel is working before handing off to user
# .note = uses bash tcp test to avoid postgresql-client dependency
# .note = retries up to 3 times as ssm tunnel takes time to initialize
######################################################################
_test_port_reachability() {
  local rds_endpoint="$1"
  local max_attempts=3
  local attempt=1

  _log "• testing port reachability (max $max_attempts attempts)..."
  _log_verbose "  local port: $LOCAL_PORT"
  _log_verbose "  remote target: $rds_endpoint:$REMOTE_PORT"

  while [[ $attempt -le $max_attempts ]]; do
    _log "  ‣ attempt $attempt/$max_attempts..."

    # use bash built-in tcp test (timeout after DB_TEST_TIMEOUT seconds)
    if timeout "$DB_TEST_TIMEOUT" bash -c "echo > /dev/tcp/localhost/$LOCAL_PORT" 2>/dev/null; then
      _log "✓ database port is reachable (attempt $attempt)"
      return 0
    fi

    if [[ $attempt -lt $max_attempts ]]; then
      _log "    connection failed, waiting 5s before retry..."
      sleep 5
    else
      _log "    connection failed"
    fi

    attempt=$((attempt + 1))
  done

  # all attempts failed - check if SSM process is still running
  if ! kill -0 "$PORT_FORWARD_PID" 2>/dev/null; then
    _log_error "ssm port forwarding process (pid: $PORT_FORWARD_PID) has died"
    _log_error "  the tunnel process exited unexpectedly"
  fi

  _log_error "database port reachability test failed after $max_attempts attempts"
  _log_error "  unable to connect to localhost:$LOCAL_PORT"
  _log_error ""
  _log_error "troubleshooting:"
  _log_error "  - verify bastion security group allows outbound to rds port $REMOTE_PORT"
  _log_error "  - verify rds security group allows inbound from bastion"
  _log_error "  - check ssm tunnel is established correctly"
  _log_error "  - verify rds endpoint is correct: $rds_endpoint"
  exit 5
}

######################################################################
# .what = ensure local port is available by killing existing users
# .why  = automatically free port for tunnel instead of manual intervention
######################################################################
_check_port_available() {
  local port="$1"

  _log_verbose "checking if port $port is available..."

  # get PIDs of processes using the port
  local pids
  pids=$(lsof -ti :$port 2>/dev/null || true)

  if [[ -n "$pids" ]]; then
    _log "port $port is in use by process(es): $pids"
    _log "• freeing port by terminating existing processes..."

    # kill all processes using the port
    for pid in $pids; do
      _log_verbose "killing process $pid..."
      if kill "$pid" 2>/dev/null; then
        _log_verbose "  sent SIGTERM to process $pid"
      else
        _log_verbose "  failed to kill process $pid (may have already exited)"
      fi
    done

    # wait for processes to terminate gracefully
    sleep 2

    # verify port is now available
    pids=$(lsof -ti :$port 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
      # processes didn't terminate, try force kill
      _log_verbose "processes still running, attempting force kill..."
      for pid in $pids; do
        _log_verbose "force killing process $pid..."
        kill -9 "$pid" 2>/dev/null || true
      done

      sleep 1

      # final check
      pids=$(lsof -ti :$port 2>/dev/null || true)
      if [[ -n "$pids" ]]; then
        _log_error "failed to free port $port (processes $pids still running)"
        _log_error "  try manually: kill -9 $pids"
        exit 3
      fi
    fi

    _log "✓ port $port is now available"
  else
    _log_verbose "port $port is available"
  fi
}

######################################################################
# .what = retrieve ssm session timeout settings from aws
# .why  = display actual configured values instead of hardcoded assumptions
######################################################################
_get_ssm_timeouts() {
  _log_verbose "retrieving ssm session timeout preferences..."

  local doc_name="SSM-SessionManagerRunShell"
  _log_verbose "executing: aws ssm get-document --name $doc_name --document-format JSON"

  # retrieve document (Content field is a JSON string, so we need to parse it twice)
  local doc_response
  if ! doc_response=$(aws ssm get-document \
    --name "$doc_name" \
    --document-format JSON \
    --output json 2>&1); then
    _log_verbose "failed to retrieve ssm document preferences: $doc_response"
    _log_verbose "  falling back to default timeout display"
    echo "unknown:unknown"
    return 0
  fi

  # parse idle timeout and max duration from the document
  # Content is a string field containing JSON, so we use fromjson to parse it
  local idle_timeout_mins
  local max_duration_mins
  idle_timeout_mins=$(echo "$doc_response" | jq -r '.Content | fromjson | .inputs.idleSessionTimeout // "20"' 2>/dev/null)
  max_duration_mins=$(echo "$doc_response" | jq -r '.Content | fromjson | .inputs.maxSessionDuration // "60"' 2>/dev/null)

  # validate we got numeric values
  if [[ -z "$idle_timeout_mins" ]] || [[ -z "$max_duration_mins" ]] || \
     ! [[ "$idle_timeout_mins" =~ ^[0-9]+$ ]] || ! [[ "$max_duration_mins" =~ ^[0-9]+$ ]]; then
    _log_verbose "failed to parse timeout values from document"
    echo "unknown:unknown"
    return 0
  fi

  _log_verbose "ssm timeouts: idle=$idle_timeout_mins min, max=$max_duration_mins min"

  # convert to human-readable format
  local idle_display
  local max_display

  # format idle timeout
  if [[ $idle_timeout_mins -ge 60 ]]; then
    local idle_hours=$((idle_timeout_mins / 60))
    idle_display="${idle_hours}h"
  else
    idle_display="${idle_timeout_mins}min"
  fi

  # format max duration
  if [[ $max_duration_mins -ge 60 ]]; then
    local max_hours=$((max_duration_mins / 60))
    max_display="${max_hours}h"
  else
    max_display="${max_duration_mins}min"
  fi

  echo "${idle_display}:${max_display}"
}

######################################################################
# .what = output connection details and usage examples for user
# .why  = provide clear instructions on how to use established connection
######################################################################
_display_connection_info() {
  local profile="$1"
  local dns_name="$2"
  local timeouts="$3"

  _log_step "connection ready"
  _log ""
  _log "• aws profile:  $profile"
  _log "• cluster:      ahbodedb"
  _log ""
  _log "connection details:"
  _log "  ‣ host:       $dns_name"
  _log "  ‣ port:       $LOCAL_PORT"
  _log "  ‣ database:   postgres"
  _log ""
  _log "🌊 connection string:"
  _log "  postgresql://<username>:<password>@$dns_name:$LOCAL_PORT/postgres"
  _log ""
  _log "example psql command:"
  _log "  psql -h $dns_name -p $LOCAL_PORT -U <username> -d postgres"
  _log ""
  _log "✨ tunnel active until ctrl+c"
  _log ""

  # display actual ssm timeout settings
  if [[ "$timeouts" != "unknown:unknown" ]]; then
    local idle_time=$(echo "$timeouts" | cut -d: -f1)
    local max_time=$(echo "$timeouts" | cut -d: -f2)
    _log "⏱️  session timeout: $idle_time idle / $max_time max duration"
  else
    _log "⏱️  session timeout: see SSM-SessionManagerRunShell document for configured values"
  fi
  _log ""
}

######################################################################
# main entry point
######################################################################

# parse options
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help|help)
      _usage 0
      ;;
    -d|--daemon)
      DAEMON_MODE=1
      shift
      ;;
    -c|--cleanup)
      CLEANUP_MODE=1
      shift
      ;;
    --with-deps-install)
      INSTALL_DEPS=1
      shift
      ;;
    -v|--verbose)
      VERBOSE=1
      shift
      ;;
    --on-fail-logdump)
      ON_FAIL_LOGDUMP=1
      shift
      ;;
    -*)
      _log_error "unknown option: $1"
      _usage 2
      ;;
    *)
      shift
      ;;
  esac
done

######################################################################
# .what = handle cleanup mode and exit
# .why  = allow script to cleanup tunnels and exit early
######################################################################
if [[ $CLEANUP_MODE -eq 1 ]]; then
  _cleanup_all_tunnels
  exit 0
fi

######################################################################
# .what = cleanup handler for graceful exit
# .why  = ensure background ssm session is terminated on ctrl+c
######################################################################
_cleanup() {
  if [[ -n "${PORT_FORWARD_PID:-}" ]] && kill -0 "$PORT_FORWARD_PID" 2>/dev/null; then
    _log ""
    _log "cleaning up ssm session..."

    # determine session ID and info file
    local session_id="${SSM_SESSION_ID:-}"
    local info_file=""

    if [[ -n "${LOCAL_PORT:-}" ]]; then
      info_file="/tmp/vpc-tunnel-${LOCAL_PORT}-info.json"
    fi

    # use the DRY cleanup function
    _cleanup_tunnel pid="$PORT_FORWARD_PID" session_id="$session_id" info_file="$info_file"

    # wait for process to exit
    wait "$PORT_FORWARD_PID" 2>/dev/null || true
    _log "✨ session terminated"
  fi
}

trap _cleanup EXIT INT TERM HUP QUIT

######################################################################
# .what = check if daemon is already running and reuse if healthy
# .why  = enable idempotent daemon mode for ci/cd pipelines
######################################################################
if [[ $DAEMON_MODE -eq 1 ]] && [[ -f "$DAEMON_PID_FILE" ]] && [[ -f "$DAEMON_INFO_FILE" ]]; then
  _log_verbose "daemon mode: checking for existing tunnel..."

  # read existing pid
  EXISTING_PID=$(cat "$DAEMON_PID_FILE" 2>/dev/null || echo "")

  if [[ -n "$EXISTING_PID" ]] && kill -0 "$EXISTING_PID" 2>/dev/null; then
    # process is alive, verify it's still functional
    _log_verbose "found existing tunnel process (pid: $EXISTING_PID)"

    # read connection info from previous run
    EXISTING_PORT=$(jq -r '.local_port // empty' "$DAEMON_INFO_FILE" 2>/dev/null || echo "")
    EXISTING_HOST=$(jq -r '.dns_name // empty' "$DAEMON_INFO_FILE" 2>/dev/null || echo "")
    EXISTING_ENV=$(jq -r '.env_access // empty' "$DAEMON_INFO_FILE" 2>/dev/null || echo "")

    # test if port is still reachable
    if [[ -n "$EXISTING_PORT" ]] && timeout 3 bash -c "echo > /dev/tcp/localhost/$EXISTING_PORT" 2>/dev/null; then
      _log "✨ existing tunnel is healthy and reachable"
      _log "• pid:        $EXISTING_PID"
      _log "• env.access: $EXISTING_ENV"
      _log "• host:       $EXISTING_HOST"
      _log "• port:       $EXISTING_PORT"
      _log ""
      _log "reusing existing tunnel (idempotent mode)"
      exit 0
    else
      _log_verbose "existing tunnel process alive but port not reachable, will recreate"
      # kill stale process
      kill "$EXISTING_PID" 2>/dev/null || true
      sleep 2
    fi
  else
    _log_verbose "pid file exists but process not running, will create new tunnel"
  fi

  # clean up stale files
  rm -f "$DAEMON_PID_FILE" "$DAEMON_INFO_FILE" 2>/dev/null || true
fi

_log_step "use.vpc.tunnel bastion connection setup"

# install dependencies if requested
if [[ $INSTALL_DEPS -eq 1 ]]; then
  _install_deps
fi

# check dependencies
_check_deps

# check aws authentication and get account id
ACCOUNT_ID=$(_check_aws_auth)

# detect env.access from account id
ENV_ACCESS=$(_get_env_access "$ACCOUNT_ID")

# log aws profile and env.access being used
PROFILE_NAME="${AWS_PROFILE:-default}"
_log "• aws profile: $PROFILE_NAME"
_log "• env.access: $ENV_ACCESS"

# configure env-specific port settings
PORT_CONFIG=$(_configure_ports "$ENV_ACCESS")
LOCAL_PORT=$(echo "$PORT_CONFIG" | cut -d: -f1)
REMOTE_PORT=$(echo "$PORT_CONFIG" | cut -d: -f2)
_log_verbose "configured ports for $ENV_ACCESS: local=$LOCAL_PORT, remote=$REMOTE_PORT"

# set port-specific daemon files to allow parallel prep/prod tunnels
DAEMON_PID_FILE="/tmp/vpc-tunnel-${LOCAL_PORT}.pid"
DAEMON_INFO_FILE="/tmp/vpc-tunnel-${LOCAL_PORT}-info.json"
_log_verbose "daemon files: pid=$DAEMON_PID_FILE, info=$DAEMON_INFO_FILE"

# get cluster configuration
CLUSTER_ID=$(_get_cluster_id "$ENV_ACCESS")
_log "• rds cluster: $CLUSTER_ID"

# find and verify bastion exists
_log_step "verify bastion instance"
BASTION_JSON=$(_find_bastion "$CLUSTER_ID")
BASTION_ID=$(echo "$BASTION_JSON" | jq -r '.InstanceId // empty')
_log "• bastion instance: $BASTION_ID"

# ensure bastion is running (start if needed)
_log_step "ensure bastion is active"
_ensure_bastion_running "$BASTION_JSON"

# get rds endpoint
_log_step "retrieve database endpoint"
RDS_ENDPOINT=$(_get_rds_endpoint "$CLUSTER_ID")
_log "• database endpoint: $RDS_ENDPOINT"

# setup local dns
_log_step "configure local dns"
DNS_NAME=$(_setup_local_dns "$CLUSTER_ID" "$ENV_ACCESS" | tail -1)

# verify port availability
_log_step "verify port availability"
_check_port_available "$LOCAL_PORT"

# establish ssm port forwarding tunnel with retry logic
_log_step "establish ssm port forwarding session"
_log "• local port: $LOCAL_PORT → remote port: $REMOTE_PORT"
_log "• target database: $RDS_ENDPOINT"
_start_port_forwarding_with_retry \
  instance_id="$BASTION_ID" \
  rds_endpoint="$RDS_ENDPOINT"

# test port reachability
_log_step "test port reachability"
_test_port_reachability "$RDS_ENDPOINT"

# retrieve ssm timeout settings
_log_verbose "retrieving ssm session timeout settings..."
SSM_TIMEOUTS=$(_get_ssm_timeouts)

# display connection info
_display_connection_info "$PROFILE_NAME" "$DNS_NAME" "$SSM_TIMEOUTS"

# handle daemon vs interactive mode
if [[ $DAEMON_MODE -eq 1 ]]; then
  # daemon mode: save pid and connection info, then exit
  _log_step "daemon mode: saving connection info"

  # write pid file
  echo "$PORT_FORWARD_PID" > "$DAEMON_PID_FILE"
  _log "• pid saved to: $DAEMON_PID_FILE"

  # write connection info as json for easy parsing
  cat > "$DAEMON_INFO_FILE" <<EOF
{
  "pid": $PORT_FORWARD_PID,
  "session_id": "${SSM_SESSION_ID:-}",
  "env_access": "$ENV_ACCESS",
  "dns_name": "$DNS_NAME",
  "local_port": $LOCAL_PORT,
  "remote_port": $REMOTE_PORT,
  "rds_endpoint": "$RDS_ENDPOINT",
  "cluster_id": "$CLUSTER_ID",
  "bastion_id": "$BASTION_ID",
  "aws_profile": "$PROFILE_NAME"
}
EOF
  _log "• connection info saved to: $DAEMON_INFO_FILE"
  _log ""
  _log "✨ tunnel running in background"
  _log "• use 'kill $PORT_FORWARD_PID' to terminate"
  _log "• or run this script again to reuse the existing tunnel (idempotent)"
  _log ""

  # disable cleanup trap for daemon mode (we want the process to persist)
  # but keep SIGHUP to handle runner disconnection
  trap - EXIT INT TERM QUIT
  trap _cleanup HUP
else
  # interactive mode: wait for port forwarding process (bring to foreground)
  _log ""
  _log "• press ctrl+c to terminate session"
  _log ""
  wait "$PORT_FORWARD_PID" 2>/dev/null || true
fi
