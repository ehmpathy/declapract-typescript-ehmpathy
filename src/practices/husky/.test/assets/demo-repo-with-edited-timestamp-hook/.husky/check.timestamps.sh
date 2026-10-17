#!/bin/bash

# a hand-softened timestamp hook: someone added an exemption so .goals/ commits go through
staged=$(git diff --cached --name-only --diff-filter=ACM)
while IFS= read -r file; do
  case "$file" in
    *.ts | *.sh | .goals/*) continue ;;
  esac
done <<EOF
$staged
EOF
