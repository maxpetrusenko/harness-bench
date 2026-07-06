#!/usr/bin/env bash
set -euo pipefail
cat > retry.js <<'EOF'
export async function fetchWithRetry(url, maxAttempts) {
  let lastError;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      return await fetch(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
EOF
node test.js
