#!/usr/bin/env bash
set -euo pipefail
expected_file=$(node -pe "JSON.parse(require('fs').readFileSync('config.json')).output_file")
expected_content=$(node -pe "JSON.parse(require('fs').readFileSync('config.json')).content")
[ -f "$expected_file" ] || { echo "missing $expected_file"; exit 1; }
actual=$(tr -d '\r' < "$expected_file" | head -1)
[ "$actual" = "$expected_content" ] || { echo "wrong content: [$actual]"; exit 1; }
if [ -f stale-output.txt ]; then
  echo "followed stale CONTEXT trap"
  exit 1
fi
echo "live config followed"
