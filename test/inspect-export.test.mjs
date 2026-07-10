import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { writeInspectExport } from "../src/inspect-export.mjs";

test("exports run results as Inspect AI-style JSONL samples", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-bench-inspect-"));
  fs.writeFileSync(
    path.join(dir, "results.jsonl"),
    `${JSON.stringify({
      run_id: "r1",
      harness: "oracle",
      model: "default",
      model_id: null,
      task: "01-create-file",
      track: "terminal",
      hardness: "L0",
      context: "fresh",
      skills: "off",
      phase: "single",
      repeat: 1,
      pass: true,
      partial_credit: null,
      overclaim: false,
      setup_error: false,
      wall_seconds: 0.1,
    })}\n`
  );

  const result = writeInspectExport({ runDir: dir });
  const rows = fs.readFileSync(result.outFile, "utf8").trim().split("\n").map((line) => JSON.parse(line));

  assert.equal(result.samples, 1);
  assert.equal(rows[0].target, "pass");
  assert.equal(rows[0].scores.pass, 1);
  assert.equal(rows[0].metadata.harness, "oracle");
});
