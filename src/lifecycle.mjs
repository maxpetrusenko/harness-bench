import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const runProbe = (command, args = []) => {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 5000 });
  return {
    ok: !result.error && result.status === 0,
    status: result.status,
    error: result.error?.message ?? null,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
};

const commandExists = (command) => {
  for (const dir of (process.env.PATH ?? "").split(path.delimiter).filter(Boolean)) {
    const candidate = path.join(dir, command);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return { ok: true, path: candidate };
    } catch {
      // Keep scanning PATH.
    }
  }
  return { ok: false, path: null };
};

export const inspectHarnessLifecycle = (harness) => {
  const capabilities = harness.capabilities ?? {};
  if (harness.kind !== "cli") {
    return {
      id: harness.id,
      kind: harness.kind,
      capabilities,
      installed: true,
      status: "toy",
      path: null,
      version: `toy:${harness.behavior ?? harness.id}`,
      install: [],
      uninstall: [],
      notes: harness.description ?? "",
    };
  }

  const executable = harness.command?.[0];
  const exists = executable ? commandExists(executable) : { ok: false, path: null };
  const versionCommand = harness.lifecycle?.version ?? [executable, "--version"].filter(Boolean);
  const versionProbe = exists.ok && versionCommand.length ? runProbe(versionCommand[0], versionCommand.slice(1)) : null;

  return {
    id: harness.id,
    kind: harness.kind,
    capabilities,
    installed: exists.ok,
    status: exists.ok ? "installed" : "missing",
    path: exists.path,
    version: versionProbe?.ok ? versionProbe.output.split("\n")[0] : null,
    install: harness.lifecycle?.install ?? [],
    uninstall: harness.lifecycle?.uninstall ?? [],
    notes: harness.lifecycle?.notes ?? "",
  };
};

const capabilityTags = (capabilities = {}) =>
  Object.entries(capabilities)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name.replace(/_/g, "-"));

export const formatLifecycleReport = (rows) => {
  const lines = ["Harness lifecycle status:\n"];
  for (const row of rows) {
    lines.push(`${row.installed ? "OK" : "MISSING"}  ${row.id}`);
    if (row.path) lines.push(`  path: ${row.path}`);
    if (row.version) lines.push(`  version: ${row.version}`);
    const tags = capabilityTags(row.capabilities);
    if (tags.length) lines.push(`  capabilities: ${tags.join(", ")}`);
    if (!row.installed && row.install.length) lines.push(`  install: ${row.install.join(" && ")}`);
    if (row.uninstall.length) lines.push(`  uninstall: ${row.uninstall.join(" && ")}`);
    if (row.notes) lines.push(`  notes: ${row.notes}`);
    lines.push("");
  }
  return lines.join("\n");
};
