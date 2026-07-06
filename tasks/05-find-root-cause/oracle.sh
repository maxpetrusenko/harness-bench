#!/usr/bin/env bash
cat > settings.json <<'EOF'
{
  "endpoint": "mock://records",
  "maxRetries": 3
}
EOF
