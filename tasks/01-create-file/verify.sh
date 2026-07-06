#!/usr/bin/env bash
set -euo pipefail
[ -f output.txt ] || { echo "output.txt missing"; exit 1; }
expected="harness-bench: hello"
actual="$(cat output.txt)"
if [ "$actual" = "$expected" ]; then
  echo "output.txt matches"
  exit 0
fi
echo "content mismatch: [$actual]"
exit 1
