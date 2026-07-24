import test from "node:test";
import assert from "node:assert/strict";
import { learningStats } from "../src/learning.mjs";

test("learningStats reports fail-to-pass and speed improvement rates", () => {
  const results = [
    { harness: "claude", model: "sonnet", task: "a", repeat: 1, phase: "A", pass: false, wall_seconds: 20 },
    { harness: "claude", model: "sonnet", task: "a", repeat: 1, phase: "B", pass: true, wall_seconds: 18 },
    { harness: "claude", model: "sonnet", task: "b", repeat: 1, phase: "A", pass: true, wall_seconds: 20 },
    { harness: "claude", model: "sonnet", task: "b", repeat: 1, phase: "B", pass: true, wall_seconds: 15 },
    { harness: "cursor-agent", model: "sonnet", task: "a", repeat: 1, phase: "A", pass: false, wall_seconds: 10 },
    { harness: "cursor-agent", model: "sonnet", task: "a", repeat: 1, phase: "B", pass: false, wall_seconds: 9.8 },
    { harness: "cursor-agent", model: "sonnet", task: "b", repeat: 1, phase: "A", pass: false, wall_seconds: 20 },
    { harness: "cursor-agent", model: "sonnet", task: "b", repeat: 1, phase: "B", pass: false, wall_seconds: 1 },
  ];

  const rows = learningStats(results);
  const claude = rows.find((row) => row.kind === "harness_model" && row.harness === "claude");
  const sonnet = rows.find((row) => row.kind === "model" && row.model === "sonnet");

  assert.equal(claude.matched_pairs, 2);
  assert.equal(claude.pass_rate_a, 0.5);
  assert.equal(claude.pass_rate_b, 1);
  assert.equal(claude.fail_to_pass_rate, 0.5);
  assert.equal(claude.wall_improvement_rate, 0.5);
  assert.equal(claude.any_improvement_rate, 1);

  assert.equal(sonnet.matched_pairs, 4);
  assert.equal(sonnet.pass_gain, 0.25);

  const cursor = rows.find((row) => row.kind === "harness_model" && row.harness === "cursor-agent");
  assert.equal(cursor.wall_improvement_rate, 0);
  assert.equal(cursor.any_improvement_rate, 0);
});

test("learningStats ignores non-retest runs", () => {
  assert.deepEqual(learningStats([{ harness: "oracle", model: "default", phase: "single", pass: true }]), []);
});
