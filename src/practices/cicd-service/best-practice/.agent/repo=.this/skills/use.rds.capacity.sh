#!/usr/bin/env bash
#
# SKILL: use.rds.capacity
#
# Ensures the RDS database has capacity and is ready to accept connections.
#
# What it does:
#   1. Opens a VPC tunnel to the database cluster (via use.vpc.tunnel)
#   2. Extracts the database host and port from the tunnel configuration
#   3. Polls the database until it responds (waking serverless RDS if paused)
#
# When to use:
#   - Before running tests or migrations that need database access
#   - When a serverless RDS instance may be paused and needs to be awakened
#   - Any time you need to ensure the database is ready before proceeding
#
# Usage:
#   STAGE=dev ./.agent/repo=.this/skills/use.rds.capacity.sh
#
# Prerequisites:
#   - STAGE environment variable must be set
#   - AWS credentials configured with SSM access
#   - sudo access (for /etc/hosts modification via vpc tunnel)
#   - pg_isready command available (postgresql-client)
#
set -eo pipefail

# failfast if STAGE is not declared
[[ -z "${STAGE:-}" ]] && echo "STAGE is not set" && exit 1

set -u

# ensure the dev tunnel is awake
.agent/repo=.this/skills/use.vpc.tunnel.ts

# ping until available
npx declastruct plan --wish .agent/repo=.this/skills/use.vpc.tunnel.ts --into .temp/tunnel.plan.json
DB_HOST=$(jq -r '.changes[] | select(.forResource.class == "DeclaredUnixHostAlias") | .state.desired.from' .temp/tunnel.plan.json)
DB_PORT=$(jq -r '.changes[] | select(.forResource.class == "DeclaredAwsVpcTunnel") | .state.desired.from.port' .temp/tunnel.plan.json)

# await for the database to have capacity (awakens serverless rds if paused)
echo "Awaiting database capacity at $DB_HOST:$DB_PORT..."
timeout 180 bash -c "until pg_isready -h $DB_HOST -p $DB_PORT; do sleep 5; done"
echo "Database is ready"

