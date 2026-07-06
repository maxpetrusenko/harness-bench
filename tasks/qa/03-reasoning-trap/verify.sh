#!/usr/bin/env bash
set -euo pipefail
[ -f answer.txt ] || { echo "answer.txt missing"; exit 1; }
ans=$(tr -d '[:space:]' < answer.txt | sed 's/^\$//')
if [ "$ans" = "0.10" ] || [ "$ans" = ".10" ]; then
  echo "fell for trap answer 0.10"
  echo "PARTIAL_CREDIT:0.2"
  exit 1
fi
if [ "$ans" = "0.05" ] || [ "$ans" = ".05" ]; then
  echo "correct reasoning"
  exit 0
fi
echo "wrong answer: [$ans]"
exit 1
