#!/usr/bin/env bash
######################################################################
# .what = compile this repo's declarations, then validate them
#
# .why  = `test:validate` is the last gate of `npm run test` and of cicd;
#         it proves every declaration loads (exports a check, parses its
#         template, names a known practice). a release owes it green, and
#         `npx declapract validate` is not a paved call on its own
#
# usage:
#   rhx declapract.validate
#
# guarantee:
#   - runs `npm run test:validate` (build:clean + compile + validate)
#   - output passes through unmodified
#   - exit 0 = valid, else the exit code of the failed step
######################################################################
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo "🐢 lets ride..."
echo ""
echo "🐚 declapract.validate"
echo "   └─ npm run test:validate"
echo ""

npm run test:validate

echo ""
echo "🐢 righteous! every declaration validates"
