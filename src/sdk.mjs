import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadHarnesses, loadSuite, loadTasks } from "./config.mjs";
import { runMatrix } from "./runner.mjs";
import { writeReport } from "./report.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const pickById = (items, ids, label) =>
  ids.map((id) => {
    const found = items.find((item) => item.id === id);
    if (!found) throw new Error(`Unknown ${label}: ${id}`);
    return found;
  });

export const runHarnessBench = async ({
  root = ROOT,
  suite = null,
  harnesses = null,
  models = ["default"],
  tasks = null,
  hardness = null,
  track = null,
  repeats = 1,
  context = "fresh",
  skills = "off",
  retest = false,
  continuous = 1,
  timeout = null,
  outDir = path.join(root, "runs", new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)),
} = {}) => {
  const allHarnesses = loadHarnesses(root);
  let allTasks = loadTasks(root);
  let suiteConfig = null;
  if (suite) suiteConfig = loadSuite(root, suite);

  const harnessIds = harnesses ?? suiteConfig?.harnesses ?? ["oracle", "noop"];
  if (tasks) allTasks = pickById(allTasks, tasks, "task");
  const levels = hardness ?? suiteConfig?.hardness ?? null;
  if (levels) allTasks = allTasks.filter((task) => levels.includes(task.hardness));
  const selectedTrack = track ?? suiteConfig?.track ?? null;
  if (selectedTrack) allTasks = allTasks.filter((task) => task.track === selectedTrack);

  const config = {
    root,
    outDir,
    suite: suiteConfig?.id ?? suite,
    harnesses: pickById(allHarnesses, harnessIds, "harness"),
    models: models ?? suiteConfig?.models ?? ["default"],
    tasks: allTasks,
    repeats: repeats ?? suiteConfig?.repeats ?? 1,
    context: context ?? suiteConfig?.context ?? "fresh",
    skills: skills ?? suiteConfig?.skills ?? "off",
    retest: Boolean(retest ?? suiteConfig?.retest),
    continuous,
    timeoutOverrideSeconds: timeout,
    concurrency: 1,
  };
  const results = await runMatrix(config);
  const reportPath = writeReport(outDir, results, config);
  return { outDir, reportPath, results };
};

