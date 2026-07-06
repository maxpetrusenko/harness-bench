#!/usr/bin/env bash
set -euo pipefail
if [[ ! -f answer.txt ]]; then
  echo "missing answer.txt"
  exit 1
fi
code="$(tr -d '[:space:]' < answer.txt)"
if [[ "$code" != "E4042" ]]; then
  echo "expected E4042 from screenshot, got: [$code]"
  exit 1
fi
echo "screenshot observation verified"
