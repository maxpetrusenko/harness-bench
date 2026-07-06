#!/usr/bin/env bash
set -euo pipefail
[ -f retry.js ] || { echo "retry.js missing"; exit 1; }
if ! diff -q test.js "$TASK_DIR/fixture/test.js" >/dev/null 2>&1; then
  echo "test.js was modified"
  exit 1
fi
node test.js || exit 1
echo "feature implemented"
