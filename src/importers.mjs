import fs from "node:fs";
import path from "node:path";

const writeTask = ({ outDir, id, title, instruction, hardness = "L2", source }) => {
  const dir = path.join(outDir, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "task.json"),
    JSON.stringify(
      {
        id,
        title,
        hardness,
        domain: "terminal",
        source,
        timeout_seconds: 900,
        instruction,
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(dir, "verify.sh"),
    `#!/usr/bin/env bash
set -euo pipefail
if [ -x verify.sh.local ]; then
  ./verify.sh.local
else
  echo "imported task needs verify.sh.local"
  exit 1
fi
`
  );
  fs.chmodSync(path.join(dir, "verify.sh"), 0o755);
  return dir;
};

const readJsonMaybe = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
};

export const importTasks = ({ root, sourceType, sourceDir, outName = sourceType }) => {
  if (!sourceType || !sourceDir) throw new Error("Usage: harness-bench import --from terminal-bench|swe-bench --source <dir>");
  const resolved = path.resolve(sourceDir);
  if (!fs.existsSync(resolved)) throw new Error(`Source directory not found: ${resolved}`);

  const outDir = path.join(root, "tasks", `imported-${outName}`);
  fs.mkdirSync(outDir, { recursive: true });
  const imported = [];

  if (sourceType === "terminal-bench") {
    const taskDirs = fs
      .readdirSync(resolved, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(resolved, entry.name));
    for (const taskDir of taskDirs) {
      const meta = readJsonMaybe(path.join(taskDir, "task.json")) ?? readJsonMaybe(path.join(taskDir, "metadata.json")) ?? {};
      const id = `tb-${path.basename(taskDir)}`.replace(/[^\w.-]+/g, "-");
      const instruction =
        meta.instruction ??
        meta.description ??
        (fs.existsSync(path.join(taskDir, "README.md")) ? fs.readFileSync(path.join(taskDir, "README.md"), "utf8") : null);
      if (!instruction) continue;
      imported.push(
        writeTask({
          outDir,
          id,
          title: meta.title ?? path.basename(taskDir),
          instruction,
          hardness: meta.hardness ?? "L3",
          source: { type: sourceType, path: taskDir },
        })
      );
    }
  } else if (sourceType === "swe-bench") {
    const files = fs
      .readdirSync(resolved)
      .filter((file) => file.endsWith(".json") || file.endsWith(".jsonl"))
      .map((file) => path.join(resolved, file));
    for (const file of files) {
      const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
      for (const line of lines) {
        const row = file.endsWith(".jsonl") ? JSON.parse(line) : readJsonMaybe(file);
        const rows = Array.isArray(row) ? row : [row];
        for (const item of rows) {
          if (!item) continue;
          const rawId = item.instance_id ?? item.id ?? item.problem_statement?.slice(0, 24);
          if (!rawId || !item.problem_statement) continue;
          const id = `swe-${String(rawId)}`.replace(/[^\w.-]+/g, "-");
          imported.push(
            writeTask({
              outDir,
              id,
              title: item.instance_id ?? id,
              instruction: item.problem_statement,
              hardness: "L4",
              source: { type: sourceType, file },
            })
          );
        }
        if (!file.endsWith(".jsonl")) break;
      }
    }
  } else {
    throw new Error(`Unsupported import source: ${sourceType}`);
  }

  fs.writeFileSync(
    path.join(outDir, "import-manifest.json"),
    JSON.stringify(
      {
        source_type: sourceType,
        source_dir: resolved,
        imported_at: new Date().toISOString(),
        imported_tasks: imported.length,
        status: "shells_only",
        required_next_step: "Add fixtures and verify.sh.local for each imported task before scored use.",
      },
      null,
      2
    )
  );

  return { outDir, imported: imported.length };
};
