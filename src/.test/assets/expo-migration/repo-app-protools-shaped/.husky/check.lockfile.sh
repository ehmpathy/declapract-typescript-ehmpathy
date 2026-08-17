#!/usr/bin/env bash
# warn the human when the lockfile changed and deps may be stale
if git diff --name-only HEAD@{1} HEAD | grep -q 'package-lock.json'; then
  echo "🔒 package-lock.json changed — run npm install"
fi
