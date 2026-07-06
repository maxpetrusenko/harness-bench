import assert from "node:assert";
import { totalCents, itemCount } from "./cart.js";

const items = [
  { priceCents: 1000, quantity: 2, discountPercent: 10 },
  { priceCents: 550, quantity: 1 },
];

assert.strictEqual(itemCount(items), 3, "itemCount");
assert.strictEqual(totalCents(items), 2350, "totalCents with 10% discount");
console.log("all tests pass");
