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

export const loadModels = (root) => {
  const dir = path.join(root, "models");
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  return files.map((file) => {
    const model = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    if (!model.id) throw new Error(`Model config ${file} is missing "id"`);
    model.harnesses = model.harnesses ?? {};
    return model;
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

export const resolveModelBinding = (harness, model) => {
  if (harness.kind === "toy") {
    return { compatible: true, model_id: null, reason: null };
  }
  if (model.id === "default") {
    return { compatible: true, model_id: null, reason: null };
  }

  const mapping = model.harnesses?.[harness.id];
  if (mapping === undefined || mapping === null || mapping === false) {
    return {
      compatible: false,
      model_id: null,
      reason: `model "${model.id}" has no mapping for harness "${harness.id}"`,
    };
  }
  if (typeof mapping === "string") {
    return { compatible: true, model_id: mapping, reason: null };
  }
  if (typeof mapping === "object" && mapping.id) {
    return { compatible: true, model_id: mapping.id, reason: null };
  }
  throw new Error(`Invalid model mapping for ${model.id} × ${harness.id}`);
};
