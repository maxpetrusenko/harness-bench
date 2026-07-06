#!/usr/bin/env bash
set -euo pipefail
file=$(node -pe "JSON.parse(require('fs').readFileSync('config.json')).output_file")
content=$(node -pe "JSON.parse(require('fs').readFileSync('config.json')).content")
printf '%s\n' "$content" > "$file"
