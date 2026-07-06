#!/usr/bin/env bash
set -euo pipefail
out="$(node main.js 2>&1)" || { echo "node main.js failed: $out"; exit 1; }
[ "$out" = "Hello, world!" ] || { echo "unexpected output: [$out]"; exit 1; }
out2="$(node main.js bench)"
[ "$out2" = "Hello, bench!" ] || { echo "unexpected output with arg: [$out2]"; exit 1; }
echo "main.js works"
