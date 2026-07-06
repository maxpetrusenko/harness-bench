import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const BENCH_VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;

const runVersionProbe = (executable, args = ["--version"]) => {
  const result = spawnSync(executable, args, { encoding: "utf8", timeout: 5000 });
  if (result.error || result.status !== 0) return null;
  const text = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim().split("\n")[0];
  return text || null;
};

const gitStatusCount = (root) => {
  const result = spawnSync("git", ["-C", root, "status", "--short"], { encoding: "utf8", timeout: 5000 });
  if (result.error || result.status !== 0) return null;
  return result.stdout.split("\n").filter(Boolean).length;
};

export const resolveHarnessVersion = (harness) => {
  if (harness.kind === "toy") return `toy:${harness.behavior ?? harness.id}`;
  const executable = harness.command?.[0];
  if (!executable) return "unknown";
  const version = runVersionProbe(executable);
  return version ?? executable;
};

export const hashFile = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").slice(0, 16);
};

export const buildProvenance = (config) => ({
  bench_version: BENCH_VERSION,
  bench_git: runVersionProbe("git", ["-C", config.root, "rev-parse", "--short", "HEAD"]),
  bench_git_dirty_count: gitStatusCount(config.root),
  created_at: new Date().toISOString(),
  host: process.env.HOSTNAME ?? "local",
  node: process.version,
  suite: config.suite ?? null,
  continuous_sequence: config.continuousSequence ?? null,
  harnesses: config.harnesses.map((h) => ({
    id: h.id,
    kind: h.kind,
    version: resolveHarnessVersion(h),
    config_hash: hashFile(path.join(config.root, "harnesses", `${h.id}.json`)),
  })),
  models: config.models,
  tasks: config.tasks.map((t) => ({
    id: t.id,
    hardness: t.hardness,
    track: t.track ?? "terminal",
    task_hash: hashFile(path.join(t.dir, "task.json")),
  })),
  conditions: {
    context: config.context,
    skills: config.skills,
    retest: config.retest,
    repeats: config.repeats,
    continuous: config.continuous ?? 1,
  },
});

export const appendRunHistory = (root, entry) => {
  const historyPath = path.join(root, "runs", "history.jsonl");
  fs.mkdirSync(path.dirname(historyPath), { recursive: true });
  fs.appendFileSync(historyPath, `${JSON.stringify(entry)}\n`);
};

export const loadRunHistory = (root, limit = 50) => {
  const historyPath = path.join(root, "runs", "history.jsonl");
  if (!fs.existsSync(historyPath)) return [];
  return fs
    .readFileSync(historyPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((line) => JSON.parse(line));
};
