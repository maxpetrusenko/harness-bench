#!/usr/bin/env bash
set -euo pipefail
[ -f answer.txt ] || { echo "answer.txt missing"; exit 1; }
ans=$(tr -d '[:space:]' < answer.txt)
[ "$ans" = "391" ] || { echo "expected 391, got [$ans]"; exit 1; }
echo "exact answer ok"
