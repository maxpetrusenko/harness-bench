import assert from "node:assert/strict";
import fs from "node:fs";
const totals = JSON.parse(fs.readFileSync("totals.json", "utf8"));
assert.deepEqual(totals, { count: 3, sum: 6, labels: ["a", "b"] });
console.log("ok");
