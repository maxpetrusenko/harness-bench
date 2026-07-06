#!/usr/bin/env bash
set -euo pipefail
if ! diff -q app.js "$TASK_DIR/fixture/app.js" >/dev/null 2>&1; then
  echo "app.js was modified"
  exit 1
fi
if ! diff -q client.js "$TASK_DIR/fixture/client.js" >/dev/null 2>&1; then
  echo "client.js was modified (bug is not in the client)"
  exit 1
fi
out="$(node app.js)" || { echo "app.js exited non-zero: $out"; exit 1; }
[ "$out" = "OK: fetched 3 records" ] || { echo "unexpected output: [$out]"; exit 1; }
echo "root cause fixed"
