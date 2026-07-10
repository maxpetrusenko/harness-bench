import assert from "node:assert/strict";
import test from "node:test";
import { extractMetrics } from "../src/metrics.mjs";
import { parseEvents } from "../src/events.mjs";

test("extracts nested token and cost metrics", () => {
  const metrics = extractMetrics(
    JSON.stringify({
      response: {
        usage: {
          input_tokens: 120,
          output_tokens: 30,
        },
      },
      billing: {
        total_cost_usd: "0.0125",
      },
    })
  );

  assert.equal(metrics.tokensIn, 120);
  assert.equal(metrics.tokensOut, 30);
  assert.equal(metrics.costUsd, 0.0125);
});

test("parses nested tool and local shell events", () => {
  const parsed = parseEvents(
    [
      JSON.stringify({ type: "response.output_item.done", item: { type: "local_shell_call", name: "exec_command" } }),
      JSON.stringify({ type: "tool_result", status: "error", tool_name: "shell" }),
      JSON.stringify({ type: "tool_result", status: "ok", tool_name: "shell" }),
    ].join("\n")
  );

  assert.equal(parsed.tool_calls, 3);
  assert.equal(parsed.tool_errors, 1);
  assert.equal(parsed.recovered_tool_errors, 1);
  assert.equal(parsed.tool_recovery_rate, 1);
});
