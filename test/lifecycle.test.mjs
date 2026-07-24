import test from "node:test";
import assert from "node:assert/strict";
import { inspectHarnessLifecycle, formatLifecycleReport } from "../src/lifecycle.mjs";

test("toy harness lifecycle is always available", () => {
  const row = inspectHarnessLifecycle({ id: "oracle", kind: "toy", behavior: "oracle" });
  assert.equal(row.installed, true);
  assert.equal(row.status, "toy");
  assert.equal(row.version, "toy:oracle");
});

test("missing cli lifecycle reports install and uninstall commands", () => {
  const row = inspectHarnessLifecycle({
    id: "missing-agent",
    kind: "cli",
    command: ["definitely-not-a-real-harness-bench-command"],
    capabilities: {
      edits_files: true,
      reads_images: true,
      headless: true,
    },
    lifecycle: {
      install: ["npm install -g missing-agent"],
      uninstall: ["npm uninstall -g missing-agent"],
      notes: "test harness",
    },
  });

  assert.equal(row.installed, false);
  assert.equal(row.status, "missing");
  const report = formatLifecycleReport([row]);
  assert.match(report, /MISSING  missing-agent/);
  assert.match(report, /capabilities: edits-files, reads-images, headless/);
  assert.match(report, /npm install -g missing-agent/);
  assert.match(report, /npm uninstall -g missing-agent/);
});
