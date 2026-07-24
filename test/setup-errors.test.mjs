import assert from "node:assert/strict";
import test from "node:test";
import { detectSetupError } from "../src/setup-errors.mjs";
import { aggregate } from "../src/report.mjs";
import { scoreCategories } from "../src/categories.mjs";

const cliHarness = { id: "codex", kind: "cli" };

test("detects auth failures as setup errors", () => {
  const error = detectSetupError({
    harness: cliHarness,
    stdout: 'API Error: 401 {"type":"authentication_error","message":"Invalid authentication credentials"}',
    stderr: "",
    exitCode: 1,
  });

  assert.equal(error.kind, "auth_error");
});

test("detects model rejection as setup error", () => {
  const error = detectSetupError({
    harness: cliHarness,
    stdout: "The 'gpt-5.3-codex' model is not supported when using Codex with a ChatGPT account.",
    stderr: "",
    exitCode: 1,
  });

  assert.equal(error.kind, "model_unavailable");
});

test("extracts nested JSON setup messages", () => {
  const error = detectSetupError({
    harness: cliHarness,
    stdout:
      '{"type":"error","message":"{\\"type\\":\\"error\\",\\"status\\":400,\\"error\\":{\\"message\\":\\"The gpt model is not supported here\\"}}"}',
    stderr: "",
    exitCode: 1,
  });

  assert.equal(error.kind, "model_unavailable");
  assert.equal(error.message, "The gpt model is not supported here");
});

test("detects CLI usage and unknown-flag errors as setup errors", () => {
  const error = detectSetupError({
    harness: { id: "bad-agent", kind: "cli" },
    stderr: "error: unknown option '--trust-me'",
    exitCode: 2,
  });

  assert.equal(error.kind, "cli_usage_error");
});

test("does not classify normal verifier failure as setup error", () => {
  const error = detectSetupError({
    harness: cliHarness,
    stdout: "I could not complete the task.",
    stderr: "",
    exitCode: 0,
  });

  assert.equal(error, null);
});

test("aggregate separates setup errors from task pass rate", () => {
  const rows = aggregate([
    { harness: "codex", model: "gpt", setup_error: true, pass: false, wall_seconds: 4, cost_usd: null },
    { harness: "codex", model: "gpt", setup_error: false, pass: true, wall_seconds: 8, cost_usd: null, phase: "single" },
  ]);

  assert.equal(rows[0].runs, 2);
  assert.equal(rows[0].task_runs, 1);
  assert.equal(rows[0].pass_rate, 1);
  assert.equal(rows[0].setup_error_rate, 0.5);
});

test("setup errors do not receive task quality scores", () => {
  const scores = scoreCategories({ setup_error: true });

  assert.equal(scores.outcome, null);
  assert.equal(scores.quality, null);
  assert.equal(scores.honesty, null);
});
