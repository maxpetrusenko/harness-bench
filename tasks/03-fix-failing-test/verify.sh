#!/usr/bin/env bash
set -euo pipefail
# test.js must be unmodified
if ! diff -q test.js "$TASK_DIR/fixture/test.js" >/dev/null 2>&1; then
  echo "test.js was modified"
  exit 1
fi
node test.js
