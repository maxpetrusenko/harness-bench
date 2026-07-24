import { loadHarnesses, loadModels, loadTasks, loadSuite } from "./config.mjs";
import { runMatrix } from "./runner.mjs";
import { writeReport } from "./report.mjs";
import { runCalibration } from "./calibrate.mjs";
import { importTasks } from "./importers.mjs";
import { writeInspectExport } from "./inspect-export.mjs";
import { loadRunHistory, BENCH_VERSION } from "./versions.mjs";
import { inspectHarnessLifecycle, formatLifecycleReport } from "./lifecycle.mjs";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const HELP = `harness-bench v${BENCH_VERSION} — measure agent harnesses, not models

Usage:
  harness-bench run [options]       Run benchmark matrix (or --suite)
  harness-bench calibrate           Validate bench pipeline (oracle/noop/overclaim)
  harness-bench list                List harnesses, tasks, suites
  harness-bench doctor              Check harness CLI install/lifecycle status
  harness-bench import [options]    Import Terminal-Bench/SWE-bench task shells
  harness-bench export [options]    Export a run for external eval tooling
  harness-bench history             Show recent runs (runs/history.jsonl)
  harness-bench report <runDir>     Rebuild report from results.jsonl

Run options:
  --suite <id>            Use suites/<id>.json (prototype, harness-compare, hard, qa)
  --harnesses <a,b,c>     Harness ids
  --models <a,b>          Model registry ids from models/*.json
  --tasks <a,b>           Task ids
  --track <terminal|image-lite|qa>
                          Filter by track
  --hardness <L0,L1>      Filter by hardness
  --repeats <n>           Repeats per cell (default: 1)
  --continuous <n>        Re-run full matrix n times (history / variance)
  --context <mode>        fresh | loaded50k | loaded100k | conflict_context
  --skills <mode>         off | on
  --retest                Round A then B with PRIOR_RUN.md
  --timeout <seconds>     Per-task timeout override
  --out <dir>             Output directory

Import options:
  --from <source>          terminal-bench | swe-bench
  --source <dir>           Source checkout or dataset directory
  --name <id>              Output task group suffix

Export options:
  --to inspect-ai          Write Inspect AI-style JSONL samples
  --run <dir>              Run directory containing results.jsonl
  --out <file>             Output file

Examples:
  harness-bench calibrate
  harness-bench run --suite prototype
  harness-bench run --suite harness-compare --out runs/compare-1
  harness-bench run --suite qa --harnesses claude,cursor-agent
  harness-bench run --suite hard --context loaded50k --continuous 3
`;

const parseArgs = (argv) => {
  const options = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      options._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    i += 1;
  }
  return options;
};

const listCommand = () => {
  const harnesses = loadHarnesses(ROOT);
  const models = loadModels(ROOT);
  const tasks = loadTasks(ROOT);
  const suites = fs.existsSync(path.join(ROOT, "suites"))
    ? fs.readdirSync(path.join(ROOT, "suites")).filter((f) => f.endsWith(".json"))
    : [];
  console.log(`harness-bench v${BENCH_VERSION}\n`);
  console.log("Suites:");
  for (const file of suites) {
    const suite = JSON.parse(fs.readFileSync(path.join(ROOT, "suites", file), "utf8"));
    console.log(`  ${suite.id.padEnd(18)} ${suite.description ?? ""}`);
  }
  console.log("\nHarnesses:");
  for (const harness of harnesses) {
    const kind = harness.kind === "cli" ? `cli: ${harness.command[0]}` : `toy (${harness.behavior})`;
    const tags = Object.entries(harness.capabilities ?? {})
      .filter(([, enabled]) => enabled)
      .map(([name]) => name.replace(/_/g, "-"))
      .join(", ");
    console.log(`  ${harness.id.padEnd(14)} ${kind}${tags ? ` [${tags}]` : ""}`);
  }
  console.log("\nModels:");
  for (const model of models) {
    const mappedHarnesses = Object.keys(model.harnesses ?? {}).join(", ") || "all harnesses, no model flag";
    console.log(`  ${model.id.padEnd(14)} ${(model.label ?? "").padEnd(28)} ${mappedHarnesses}`);
  }
  console.log("\nTasks:");
  for (const task of tasks) {
    console.log(`  ${task.id.padEnd(28)} ${task.hardness}  [${task.track}]  ${task.title}`);
  }
};

const historyCommand = () => {
  const rows = loadRunHistory(ROOT, 20);
  if (rows.length === 0) {
    console.log("No history yet. Run a benchmark first.");
    return;
  }
  console.log("Recent runs (runs/history.jsonl):\n");
  for (const row of rows.reverse()) {
    console.log(
      `${row.created_at}  v${row.bench_version}  suite=${row.suite ?? "-"}  pass=${Math.round(row.pass_rate * 100)}%  runs=${row.runs}`
    );
    console.log(`  dir: ${row.run_dir}`);
    console.log(`  harnesses: ${row.harnesses.map((h) => `${h.id}@${h.version?.slice(0, 40) ?? "?"}`).join(", ")}`);
    console.log("");
  }
};

const doctorCommand = (options) => {
  const allHarnesses = loadHarnesses(ROOT);
  const selected = options.harnesses
    ? options.harnesses
        .split(",")
        .map((id) => id.trim())
        .map((id) => {
          const found = allHarnesses.find((h) => h.id === id);
          if (!found) throw new Error(`Unknown harness "${id}". Run "harness-bench list".`);
          return found;
        })
    : allHarnesses;
  const rows = selected.map(inspectHarnessLifecycle);
  console.log(formatLifecycleReport(rows));
};

const importCommand = (options) => {
  const result = importTasks({
    root: ROOT,
    sourceType: options.from,
    sourceDir: options.source,
    outName: options.name ?? options.from,
  });
  console.log(`Imported ${result.imported} task shells to ${result.outDir}`);
  console.log("Add task fixtures and verify.sh.local files before using them in scored runs.");
};

const exportCommand = (options) => {
  if (options.to !== "inspect-ai") throw new Error("Usage: harness-bench export --to inspect-ai --run <runDir> [--out <file>]");
  if (!options.run) throw new Error("Usage: harness-bench export --to inspect-ai --run <runDir> [--out <file>]");
  const result = writeInspectExport({ runDir: options.run, outFile: options.out ?? null });
  console.log(`Exported ${result.samples} samples to ${result.outFile}`);
};

const buildRunConfig = (options) => {
  const allHarnesses = loadHarnesses(ROOT);
  const allModels = loadModels(ROOT);
  let allTasks = loadTasks(ROOT);
  let suite = null;

  if (options.suite) {
    suite = loadSuite(ROOT, options.suite);
  }

  const harnessIds = (options.harnesses ?? suite?.harnesses ?? "oracle,noop").toString().split(",").map((s) => s.trim());
  const harnesses = harnessIds.map((id) => {
    const found = allHarnesses.find((h) => h.id === id);
    if (!found) throw new Error(`Unknown harness "${id}". Run "harness-bench list".`);
    return found;
  });

  const modelIds = (options.models ?? suite?.models ?? "default").toString().split(",").map((s) => s.trim());
  const models = modelIds.map((id) => {
    const found = allModels.find((m) => m.id === id);
    if (!found) throw new Error(`Unknown model "${id}". Run "harness-bench list".`);
    return found;
  });

  if (options.tasks) {
    const taskIds = options.tasks.split(",").map((s) => s.trim());
    allTasks = taskIds.map((id) => {
      const found = allTasks.find((t) => t.id === id);
      if (!found) throw new Error(`Unknown task "${id}".`);
      return found;
    });
  }
  if (suite?.hardness) {
    const levels = suite.hardness.map((s) => s.toUpperCase());
    allTasks = allTasks.filter((t) => levels.includes(t.hardness));
  }
  if (options.hardness) {
    const levels = options.hardness.split(",").map((s) => s.trim().toUpperCase());
    allTasks = allTasks.filter((t) => levels.includes(t.hardness));
  }
  if (options.track ?? suite?.track) {
    const track = options.track ?? suite.track;
    allTasks = allTasks.filter((t) => t.track === track);
  }
  if (allTasks.length === 0) throw new Error("No tasks selected.");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.resolve(ROOT, options.out ?? path.join("runs", suite?.id ?? stamp));

  return {
    root: ROOT,
    outDir,
    suite: suite?.id ?? null,
    harnesses,
    models,
    tasks: allTasks,
    repeats: Number(options.repeats ?? suite?.repeats ?? 1),
    context: options.context ?? suite?.context ?? "fresh",
    skills: options.skills === true ? "on" : (options.skills ?? suite?.skills ?? "off"),
    retest: Boolean(options.retest ?? suite?.retest),
    continuous: Number(options.continuous ?? 1),
    timeoutOverrideSeconds: options.timeout ? Number(options.timeout) : null,
    concurrency: Number(options.concurrency ?? 1),
  };
};

const runCommand = async (options) => {
  const config = buildRunConfig(options);
  if (!["fresh", "loaded50k", "loaded100k", "conflict_context"].includes(config.context)) {
    throw new Error(`--context must be fresh, loaded50k, loaded100k, or conflict_context`);
  }
  if (!["off", "on"].includes(config.skills)) throw new Error(`--skills must be off or on`);

  const results = await runMatrix(config);
  const reportPath = writeReport(config.outDir, results, config);
  console.log(`\nDone. ${results.length} runs.`);
  console.log(`  results:  ${path.join(config.outDir, "results.jsonl")}`);
  console.log(`  scores:   ${path.join(config.outDir, "scores.csv")}`);
  console.log(`  failures: ${path.join(config.outDir, "failures.md")}`);
  console.log(`  history:  ${path.join(ROOT, "runs", "history.jsonl")}`);
  console.log(`  report:   ${reportPath}`);
  console.log(`\nOpen: open "${reportPath}"`);
};

const reportCommand = (options) => {
  const runDir = options._[0];
  if (!runDir) throw new Error("Usage: harness-bench report <runDir>");
  const resolved = path.resolve(runDir);
  const resultsPath = path.join(resolved, "results.jsonl");
  if (!fs.existsSync(resultsPath)) throw new Error(`No results.jsonl in ${resolved}`);
  const results = fs
    .readFileSync(resultsPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const manifestPath = path.join(resolved, "manifest.json");
  const config = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
  const reportPath = writeReport(resolved, results, config);
  console.log(`Rebuilt: ${reportPath}`);
};

export const main = async (argv) => {
  const command = argv[0];
  const options = parseArgs(argv.slice(1));

  if (!command || command === "help" || command === "--help") {
    console.log(HELP);
    return;
  }
  if (command === "list") return listCommand();
  if (command === "doctor") return doctorCommand(options);
  if (command === "import") return importCommand(options);
  if (command === "export") return exportCommand(options);
  if (command === "history") return historyCommand();
  if (command === "calibrate") return runCalibration(ROOT);
  if (command === "run") return runCommand(options);
  if (command === "report") return reportCommand(options);
  throw new Error(`Unknown command "${command}". Try: harness-bench help`);
};
