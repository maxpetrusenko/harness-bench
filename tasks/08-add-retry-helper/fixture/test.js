import assert from "node:assert/strict";
import { fetchWithRetry } from "./retry.js";

let attempts = 0;
global.fetch = async () => {
  attempts += 1;
  if (attempts < 3) throw new Error("network");
  return { ok: true, json: async () => ({ ok: true }) };
};

const result = await fetchWithRetry("http://x", 5);
assert.equal(result.ok, true);
assert.equal(attempts, 3);
console.log("tests pass");
