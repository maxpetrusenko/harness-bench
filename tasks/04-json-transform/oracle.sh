#!/usr/bin/env bash
node --input-type=module - <<'EOF'
import fs from "node:fs";
const orders = JSON.parse(fs.readFileSync("data.json", "utf8"));
const byStatus = {};
let totalCents = 0;
for (const order of orders) {
  totalCents += order.amountCents;
  byStatus[order.status] = (byStatus[order.status] ?? 0) + 1;
}
fs.writeFileSync("summary.json", JSON.stringify({ orderCount: orders.length, totalCents, byStatus }, null, 2));
EOF
