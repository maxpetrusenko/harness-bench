import fs from "node:fs";
import path from "node:path";

export const loadHarnesses = (root) => {
  const dir = path.join(root, "harnesses");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  return files.map((file) => {
    const harness = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    if (!harness.id) throw new Error(`Harness config ${file} is missing "id"`);
    if (harness.kind === "cli" && !Array.isArray(harness.command)) {
      throw new Error(`Harness config ${file} needs a "command" array`);
    }
    return harness;
  });
};

export const loadTasks = (root) => {
  const tracks = [
    { dir: path.join(root, "tasks"), track: "terminal" },
    { dir: path.join(root, "tasks", "qa"), track: "qa" },
  ];
  const tasks = [];
  const taskDirsIn = (dir) => {
    const entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(dir, entry.name))
      .sort();
    const nested = [];
    for (const entryDir of entries) {
      if (path.basename(entryDir) === "qa" && path.basename(dir) === "tasks") continue;
      if (fs.existsSync(path.join(entryDir, "task.json"))) nested.push(entryDir);
      else {
        for (const child of fs
          .readdirSync(entryDir, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => path.join(entryDir, entry.name))
          .sort()) {
          if (fs.existsSync(path.join(child, "task.json"))) nested.push(child);
        }
      }
    }
    return nested;
  };
  for (const { dir, track } of tracks) {
    if (!fs.existsSync(dir)) continue;
    for (const taskDir of taskDirsIn(dir)) {
      const manifestPath = path.join(taskDir, "task.json");
      const task = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      task.id = task.id ?? (track === "qa" ? `qa-${path.basename(taskDir)}` : path.basename(taskDir));
      task.dir = taskDir;
      task.track = task.track ?? task.domain ?? track;
      if (!task.instruction) throw new Error(`Task ${task.id} is missing "instruction"`);
      if (!fs.existsSync(path.join(taskDir, "verify.sh"))) {
        throw new Error(`Task ${task.id} is missing verify.sh`);
      }
      tasks.push(task);
    }
  }
  return tasks.sort((a, b) => a.id.localeCompare(b.id));
};

export const loadSuite = (root, suiteId) => {
  const suitePath = path.join(root, "suites", `${suiteId}.json`);
  if (!fs.existsSync(suitePath)) throw new Error(`Unknown suite "${suiteId}". Check suites/`);
  return JSON.parse(fs.readFileSync(suitePath, "utf8"));
};

export const resolveModelId = (harness, canonicalModel) => {
  if (canonicalModel === "default") return harness.models?.default ?? null;
  return harness.models?.[canonicalModel] ?? canonicalModel;
};
