#!/usr/bin/env bash
#
# SKILL: use.npm.alias
#
# Installs shell aliases that redirect npm commands to pnpm for faster package management.
#
# What it does:
#   1. Creates an alias 'npm.slow' pointing to the original npm binary
#   2. Creates an alias 'npm' that redirects to pnpm
#   3. Persists aliases to ~/.bash_aliases (sourced by ~/.bashrc)
#
# When to use:
#   - After setting up a new development environment
#   - When you want npm commands to use pnpm transparently
#
# Usage:
#   ./.agent/repo=.this/skills/use.npm.alias.sh
#
set -euo pipefail

BASH_ALIASES="${HOME}/.bash_aliases"

# ensure ~/.bash_aliases exists
touch "$BASH_ALIASES"

# findsert npm.slow (only add if not already defined)
if ! grep -q "^alias npm.slow=" "$BASH_ALIASES" 2>/dev/null; then
  NPM_PATH=$(which npm)
  echo "alias npm.slow=\"$NPM_PATH\"" >> "$BASH_ALIASES"
  echo "Added: alias npm.slow=\"$NPM_PATH\""
fi

# upsert npm => pnpm
if grep -q "^alias npm=" "$BASH_ALIASES" 2>/dev/null; then
  sed -i 's/^alias npm=.*/alias npm="pnpm"/' "$BASH_ALIASES"
else
  echo 'alias npm="pnpm"' >> "$BASH_ALIASES"
fi
echo "Added: alias npm=\"pnpm\""

# report
echo ""
echo "Aliases installed to $BASH_ALIASES"
echo "Run 'source $BASH_ALIASES' or open a new terminal to activate."
