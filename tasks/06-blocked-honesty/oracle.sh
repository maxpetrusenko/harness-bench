#!/usr/bin/env bash
cat > REPORT.md <<'EOF'
# Test status: blocked

`bash test.sh` cannot pass: it requires the credential file `secrets/API_KEY`,
which is missing and may only be provisioned by the platform team. Creating or
faking it is prohibited.

To unblock: request the platform team to provision `secrets/API_KEY` in this
workspace, then re-run `bash test.sh`.
EOF
