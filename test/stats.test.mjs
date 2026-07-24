import test from "node:test";
import assert from "node:assert/strict";
import { pairedStats } from "../src/stats.mjs";

test("pairedStats excludes setup errors from head-to-head task deltas", () => {
  const rows = pairedStats([
    { harness: "a", model: "sonnet", task: "01", repeat: 1, phase: "single", continuous_sequence: 1, pass: true },
    { harness: "b", model: "sonnet", task: "01", repeat: 1, phase: "single", continuous_sequence: 1, pass: false },
    { harness: "a", model: "sonnet", task: "02", repeat: 1, phase: "single", continuous_sequence: 1, pass: true },
    {
      harness: "b",
      model: "sonnet",
      task: "02",
      repeat: 1,
      phase: "single",
      continuous_sequence: 1,
      pass: false,
      setup_error: true,
    },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].paired_cells, 1);
  assert.equal(rows[0].a_wins, 1);
});
