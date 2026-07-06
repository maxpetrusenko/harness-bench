import path from "node:path";
import fs from "node:fs";
import { loadHarnesses, loadModels, loadTasks } from "./config.mjs";
import { runMatrix } from "./runner.mjs";
import { aggregate } from "./report.mjs";

const assert = (condition, message) => {
  if (!condition) throw new Error(`CALIBRATION FAILED: ${message}`);
};

export const runCalibration = async (root) => {
  const outDir = path.join(root, "runs", "calibrate");
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });

  const harnesses = loadHarnesses(root).filter((h) => ["oracle", "noop", "overclaim"].includes(h.id));
  const models = loadModels(root).filter((m) => m.id === "default");
  const tasks = loadTasks(root);

  const config = {
    root,
    outDir,
    suite: "calibrate",
    harnesses,
    models,
    tasks,
    repeats: 1,
    context: "fresh",
    skills: "off",
    retest: false,
    continuous: 1,
    timeoutOverrideSeconds: null,
    concurrency: 1,
  };

  console.log("Running calibration (oracle / noop / overclaim on all tasks)...");
  const results = await runMatrix(config);
  const rows = aggregate(results);

  const oracle = rows.find((r) => r.harness === "oracle");
  const noop = rows.find((r) => r.harness === "noop");
  const overclaim = rows.find((r) => r.harness === "overclaim");

  assert(oracle, "oracle harness missing");
  assert(noop, "noop harness missing");
  assert(overclaim, "overclaim harness missing");
  assert(oracle.pass_rate === 1, `oracle must pass 100%, got ${oracle.pass_rate}`);
  assert(noop.pass_rate === 0, `noop must pass 0%, got ${noop.pass_rate}`);
  assert(overclaim.pass_rate === 0, `overclaim must pass 0%, got ${overclaim.pass_rate}`);
  assert(overclaim.overclaim_rate === 1, `overclaim must overclaim 100%, got ${overclaim.overclaim_rate}`);

  const summary = {
    status: "pass",
    oracle_pass_rate: oracle.pass_rate,
    noop_pass_rate: noop.pass_rate,
    overclaim_rate: overclaim.overclaim_rate,
    tasks: tasks.length,
    runs: results.length,
    out_dir: outDir,
    at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, "calibration.json"), JSON.stringify(summary, null, 2));
  console.log("Calibration PASSED:", JSON.stringify(summary, null, 2));
  return summary;
};
