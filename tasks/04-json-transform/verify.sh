#!/usr/bin/env bash
set -euo pipefail
node --input-type=module - <<'EOF'
import fs from "node:fs";
const summary = JSON.parse(fs.readFileSync("summary.json", "utf8"));
const expected = {
  orderCount: 6,
  totalCents: 16785,
  byStatus: { shipped: 3, pending: 2, cancelled: 1 },
};
const fail = (message) => { console.error(message); process.exit(1); };
if (summary.orderCount !== expected.orderCount) fail(`orderCount: ${summary.orderCount}`);
if (summary.totalCents !== expected.totalCents) fail(`totalCents: ${summary.totalCents}`);
for (const [status, count] of Object.entries(expected.byStatus)) {
  if (summary.byStatus?.[status] !== count) fail(`byStatus.${status}: ${summary.byStatus?.[status]}`);
}
if (Object.keys(summary.byStatus).length !== 3) fail("byStatus has extra keys");
console.log("summary.json is correct");
EOF
