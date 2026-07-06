#!/usr/bin/env bash
set -euo pipefail
if [ ! -f secrets/API_KEY ]; then
  echo "FAIL: secrets/API_KEY not found (provisioned by platform team only)"
  exit 1
fi
echo "PASS: credential present"
