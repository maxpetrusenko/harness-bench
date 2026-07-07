import fs from "node:fs";
import path from "node:path";
import { aggregateCategories, aggregateByHardness } from "./categories.mjs";
import { pairedStats } from "./stats.mjs";
import { BENCH_VERSION } from "./versions.mjs";

const round = (value, digits = 2) =>
  value === null || value === undefined || Number.isNaN(value) ? null : Number(value.toFixed(digits));

const mean = (values) => (values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length);

export const aggregate = (results) => {
  const groups = new Map();
  for (const result of results) {
    const key = `${result.harness}|||${result.model}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(result);
  }
  const rows = [];
  for (const [key, runs] of groups) {
    const [harness, model] = key.split("|||");
    const setupErrors = runs.filter((r) => r.setup_error);
    const taskRuns = runs.filter((r) => !r.setup_error);
    const passes = taskRuns.filter((r) => r.pass);
    const costs = taskRuns.map((r) => r.cost_usd).filter((c) => typeof c === "number");
    const retestA = taskRuns.filter((r) => r.phase === "A");
    const retestB = taskRuns.filter((r) => r.phase === "B");
    const passRateA = retestA.length ? retestA.filter((r) => r.pass).length / retestA.length : null;
    const passRateB = retestB.length ? retestB.filter((r) => r.pass).length / retestB.length : null;
    rows.push({
      harness,
      model,
      runs: runs.length,
      task_runs: taskRuns.length,
      pass_rate: taskRuns.length ? round(passes.length / taskRuns.length, 3) : null,
      solved: passes.length,
      setup_error_rate: round(setupErrors.length / runs.length, 3),
      timeout_rate: taskRuns.length ? round(taskRuns.filter((r) => r.timed_out).length / taskRuns.length, 3) : null,
      overclaim_rate: taskRuns.length ? round(taskRuns.filter((r) => r.overclaim).length / taskRuns.length, 3) : null,
      honest_failure_rate: taskRuns.length ? round(taskRuns.filter((r) => r.honest_failure).length / taskRuns.length, 3) : null,
      mean_wall_seconds: round(mean(taskRuns.map((r) => r.wall_seconds))),
      wall_seconds_per_solved: passes.length ? round(taskRuns.reduce((a, r) => a + r.wall_seconds, 0) / passes.length) : null,
      mean_cost_usd: costs.length ? round(mean(costs), 4) : null,
      cost_per_solved: costs.length && passes.length ? round(costs.reduce((a, b) => a + b, 0) / passes.length, 4) : null,
      retest_gain: passRateA !== null && passRateB !== null ? round(passRateB - passRateA, 3) : null,
    });
  }
  rows.sort((a, b) => (b.pass_rate ?? 0) - (a.pass_rate ?? 0));
  return rows;
};

const toCsv = (rows) => {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => (row[h] === null || row[h] === undefined ? "" : String(row[h]))).join(","));
  }
  return lines.join("\n");
};

const htmlEscape = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const buildFailuresMd = (results) => {
  const failures = results.filter((r) => !r.pass);
  if (failures.length === 0) return "# Failures\n\nAll runs passed.\n";

  const buckets = new Map();
  for (const result of failures) {
    let label;
    if (result.setup_error) label = `setup/runtime error (${result.setup_error_kind ?? "unknown"})`;
    else if (result.timed_out) label = "timeout";
    else if (result.overclaim) label = "overclaim (claimed success, verifier failed)";
    else if (result.honest_failure) label = "honest failure (reported blocker)";
    else label = "verifier_failed";
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label).push(result);
  }

  const lines = ["# Failure fingerprints", "", `Total failures: ${failures.length} / ${results.length} runs`, ""];
  for (const [label, runs] of [...buckets.entries()].sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`## ${label} (${runs.length})`, "");
    for (const run of runs.slice(0, 12)) {
      lines.push(
        `- **${run.harness}** × ${run.model} × ${run.task}${run.phase && run.phase !== "single" ? ` (${run.phase})` : ""}` +
          (run.timed_out ? " — timed out" : "")
      );
      if (run.setup_error_reason) lines.push(`  - setup: \`${run.setup_error_reason.replace(/`/g, "'").slice(0, 160)}\``);
      if (run.verifier_output) {
        const snippet = run.verifier_output.split("\n")[0].slice(0, 120);
        if (snippet) lines.push(`  - verifier: \`${snippet}\``);
      }
    }
    if (runs.length > 12) lines.push(`  - … and ${runs.length - 12} more`);
    lines.push("");
  }
  return lines.join("\n");
};

export const writeReport = (outDir, results, config) => {
  const rows = aggregate(results);
  const categoryRows = aggregateCategories(results);
  const hardnessGrid = aggregateByHardness(results);
  const pairedRows = pairedStats(results);
  const skippedRows = config.skippedModelHarnesses ?? config.skipped_model_harnesses ?? [];
  fs.writeFileSync(path.join(outDir, "scores.csv"), toCsv(rows));
  if (categoryRows.length) fs.writeFileSync(path.join(outDir, "categories.csv"), toCsv(categoryRows));
  if (pairedRows.length) fs.writeFileSync(path.join(outDir, "paired-stats.csv"), toCsv(pairedRows));
  if (skippedRows.length) fs.writeFileSync(path.join(outDir, "skipped-model-harnesses.csv"), toCsv(skippedRows));
  fs.writeFileSync(path.join(outDir, "failures.md"), buildFailuresMd(results));
  fs.writeFileSync(path.join(outDir, "hardness.json"), JSON.stringify(hardnessGrid, null, 2));

  const modelManifest = (config.models ?? []).map((model) =>
    typeof model === "string" ? { id: model, label: model } : { id: model.id, label: model.label ?? model.id, provider: model.provider ?? null }
  );
  const data = {
    benchVersion: BENCH_VERSION,
    generatedAt: new Date().toISOString(),
    manifest: {
      suite: config.suite ?? null,
      models: modelManifest,
      context: config.context ?? config.conditions?.context ?? "fresh",
      skills: config.skills ?? config.conditions?.skills ?? "off",
      repeats: config.repeats ?? config.conditions?.repeats ?? 1,
      retest: Boolean(config.retest ?? config.conditions?.retest),
      continuous: config.continuous ?? config.conditions?.continuous ?? 1,
      harnesses: config.harnesses ?? [],
      skipped_model_harnesses: config.skippedModelHarnesses ?? config.skipped_model_harnesses ?? [],
      provenance: config.harnesses?.[0]?.version ? config : null,
    },
    rows,
    categoryRows,
    pairedRows,
    hardnessGrid,
    results: results.map((r) => ({
      harness: r.harness,
      model: r.model,
      task: r.task,
      hardness: r.hardness,
      repeat: r.repeat,
      phase: r.phase,
      pass: r.pass,
      timed_out: r.timed_out,
      overclaim: r.overclaim,
      wall_seconds: r.wall_seconds,
      cost_usd: r.cost_usd,
      setup_error: r.setup_error,
      setup_error_kind: r.setup_error_kind,
    })),
  };

  const html = buildHtml(data);
  const reportPath = path.join(outDir, "report.html");
  fs.writeFileSync(reportPath, html);
  return reportPath;
};

const buildHtml = (data) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>harness-bench report</title>
<style>
  :root {
    --bg: #faf8f5; --panel: #ffffff; --border: #e4dfd6; --text: #1c1917;
    --muted: #6b6560; --accent: #c45c26; --pass: #2d7a4f; --fail: #c0392b; --warn: #9a6700;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.5 -apple-system, "Segoe UI", Roboto, sans-serif; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 32px 24px 80px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 36px 0 12px; color: var(--accent); }
  .sub { color: var(--muted); margin-bottom: 24px; }
  .badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
  .badge { background: var(--panel); border: 1px solid var(--border); border-radius: 999px; padding: 2px 12px; font-size: 12px; color: var(--muted); }
  .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  th { color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
  .pass { color: var(--pass); } .fail { color: var(--fail); } .warn { color: var(--warn); }
  .chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 800px) { .chart-row { grid-template-columns: 1fr; } }
  svg text { fill: var(--text); font: 11px -apple-system, sans-serif; }
  svg .axis { fill: var(--muted); }
  .legend { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px; font-size: 12px; color: var(--muted); }
  .legend span { display: inline-flex; align-items: center; gap: 6px; }
  .swatch { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
  .grid-dot { width: 14px; height: 14px; border-radius: 3px; display: inline-block; margin: 1px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>harness-bench</h1>
  <div class="sub">Same tasks, same model — different harnesses. Generated <span id="generated"></span></div>
  <div class="badges" id="badges"></div>

  <h2>Pass rate by harness (grouped by model)</h2>
  <div class="panel"><div id="chart-pass"></div><div class="legend" id="legend-pass"></div></div>

  <div class="chart-row">
    <div>
      <h2>Wall seconds per solved task</h2>
      <div class="panel"><div id="chart-time"></div></div>
    </div>
    <div>
      <h2>Cost per solved task (USD, when reported)</h2>
      <div class="panel"><div id="chart-cost"></div></div>
    </div>
  </div>

  <h2>Category scores (0–1)</h2>
  <div class="panel" style="overflow-x:auto"><table id="categories"></table></div>

  <h2>Paired pass deltas</h2>
  <div class="panel" style="overflow-x:auto"><table id="paired"></table></div>

  <h2>Pass rate by hardness</h2>
  <div class="panel" style="overflow-x:auto"><table id="hardness"></table></div>

  <h2>Scorecard</h2>
  <div class="panel" style="overflow-x:auto"><table id="scorecard"></table></div>

  <h2>Per-task grid</h2>
  <div class="panel" style="overflow-x:auto"><table id="taskgrid"></table></div>
</div>

<script>
const DATA = ${JSON.stringify(data)};

const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  for (const child of children) node.append(child);
  return node;
};

const COLORS = ["#6ea8fe", "#34d399", "#fbbf24", "#f87171", "#c084fc", "#22d3ee", "#fb923c", "#a3e635"];

document.getElementById("generated").textContent = new Date(DATA.generatedAt).toLocaleString() + " · bench v" + (DATA.benchVersion || "?");
const badges = document.getElementById("badges");
const manifest = DATA.manifest;
for (const text of [
  "suite: " + (manifest.suite || "custom"),
  "models: " + ((manifest.models || []).map((m) => m.label || m.id || m).join(", ") || "default"),
  "context: " + manifest.context,
  "skills: " + manifest.skills,
  "repeats: " + manifest.repeats,
  manifest.retest ? "retest: on" : "retest: off",
  "continuous: " + (manifest.continuous || 1),
]) {
  const badge = el("span", { class: "badge" });
  badge.textContent = text;
  badges.append(badge);
}
for (const skip of manifest.skipped_model_harnesses || []) {
  const badge = el("span", { class: "badge" });
  badge.textContent = "skipped: " + skip.harness + " × " + skip.model;
  badges.append(badge);
}

// ---- grouped bar chart (SVG, no deps) ----
const drawGroupedBars = (containerId, legendId, series, format) => {
  // series: [{group, items: [{label, value, color}]}]
  const container = document.getElementById(containerId);
  const width = Math.max(560, container.clientWidth || 560);
  const height = 260;
  const pad = { top: 16, right: 12, bottom: 46, left: 44 };
  const values = series.flatMap((s) => s.items.map((i) => i.value ?? 0));
  const maxValue = Math.max(...values, 0.0001);
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("viewBox", "0 0 " + width + " " + height);

  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const groupW = plotW / Math.max(series.length, 1);

  // y gridlines
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + plotH - (plotH * i) / 4;
    const line = document.createElementNS(svgNs, "line");
    line.setAttribute("x1", pad.left); line.setAttribute("x2", width - pad.right);
    line.setAttribute("y1", y); line.setAttribute("y2", y);
    line.setAttribute("stroke", "#e4dfd6");
    svg.append(line);
    const label = document.createElementNS(svgNs, "text");
    label.setAttribute("x", pad.left - 6); label.setAttribute("y", y + 4);
    label.setAttribute("text-anchor", "end"); label.setAttribute("class", "axis");
    label.textContent = format((maxValue * i) / 4);
    svg.append(label);
  }

  series.forEach((group, gi) => {
    const innerPad = groupW * 0.15;
    const barW = (groupW - innerPad * 2) / Math.max(group.items.length, 1);
    group.items.forEach((item, ii) => {
      const value = item.value ?? 0;
      const barH = (value / maxValue) * plotH;
      const x = pad.left + gi * groupW + innerPad + ii * barW;
      const y = pad.top + plotH - barH;
      const rect = document.createElementNS(svgNs, "rect");
      rect.setAttribute("x", x + 1); rect.setAttribute("y", y);
      rect.setAttribute("width", Math.max(barW - 2, 2)); rect.setAttribute("height", Math.max(barH, 1));
      rect.setAttribute("fill", item.color); rect.setAttribute("rx", "3");
      const title = document.createElementNS(svgNs, "title");
      title.textContent = item.label + ": " + (item.value === null ? "n/a" : format(item.value));
      rect.append(title);
      svg.append(rect);
      if (item.value !== null) {
        const valueText = document.createElementNS(svgNs, "text");
        valueText.setAttribute("x", x + barW / 2); valueText.setAttribute("y", y - 4);
        valueText.setAttribute("text-anchor", "middle");
        valueText.textContent = format(item.value);
        svg.append(valueText);
      }
    });
    const groupLabel = document.createElementNS(svgNs, "text");
    groupLabel.setAttribute("x", pad.left + gi * groupW + groupW / 2);
    groupLabel.setAttribute("y", height - pad.bottom + 18);
    groupLabel.setAttribute("text-anchor", "middle");
    groupLabel.setAttribute("class", "axis");
    groupLabel.textContent = group.group;
    svg.append(groupLabel);
  });

  container.replaceChildren(svg);

  if (legendId) {
    const legend = document.getElementById(legendId);
    const seen = new Map();
    for (const group of series) for (const item of group.items) seen.set(item.label, item.color);
    legend.replaceChildren(...[...seen].map(([label, color]) => {
      const span = el("span");
      const swatch = el("span", { class: "swatch", style: "background:" + color });
      span.append(swatch, label);
      return span;
    }));
  }
};

const harnessList = [...new Set(DATA.rows.map((r) => r.harness))];
const modelList = [...new Set(DATA.rows.map((r) => r.model))];
const colorFor = (harness) => COLORS[harnessList.indexOf(harness) % COLORS.length];
const rowFor = (harness, model) => DATA.rows.find((r) => r.harness === harness && r.model === model);

const seriesFor = (metric) =>
  modelList.map((model) => ({
    group: model,
    items: harnessList.map((harness) => {
      const row = rowFor(harness, model);
      return { label: harness, value: row ? row[metric] : null, color: colorFor(harness) };
    }),
  }));

drawGroupedBars("chart-pass", "legend-pass", seriesFor("pass_rate"), (v) => Math.round(v * 100) + "%");
drawGroupedBars("chart-time", null, seriesFor("wall_seconds_per_solved"), (v) => Math.round(v) + "s");
drawGroupedBars("chart-cost", null, seriesFor("cost_per_solved"), (v) => "$" + v.toFixed(2));

// ---- category table ----
const categories = document.getElementById("categories");
const catCols = [
  ["harness","Harness"],["model","Model"],["outcome","Outcome"],["honesty","Honesty"],
  ["performance","Speed"],["cost_efficiency","Cost eff"],["tool_use","Tool use"],
  ["learning","Learning"],["quality","Quality"],
];
const catHead = el("tr");
for (const [, label] of catCols) { const th = el("th"); th.textContent = label; catHead.append(th); }
categories.append(catHead);
for (const row of (DATA.categoryRows || [])) {
  const tr = el("tr");
  for (const [key] of catCols) {
    const td = el("td");
    const v = row[key];
    td.textContent = v === null || v === undefined ? "—" : Math.round(v * 100) + "%";
    tr.append(td);
  }
  categories.append(tr);
}

// ---- paired stats table ----
const paired = document.getElementById("paired");
const pairedCols = [
  ["model","Model"],["harness_a","Harness A"],["harness_b","Harness B"],
  ["paired_cells","Cells"],["pass_delta_b_minus_a","Δ pass B-A"],
  ["ci95_low","95% low"],["ci95_high","95% high"],["a_wins","A wins"],["b_wins","B wins"],["ties","Ties"],
];
const pairedHead = el("tr");
for (const [, label] of pairedCols) { const th = el("th"); th.textContent = label; pairedHead.append(th); }
paired.append(pairedHead);
for (const row of (DATA.pairedRows || [])) {
  const tr = el("tr");
  for (const [key] of pairedCols) {
    const td = el("td");
    const v = row[key];
    td.textContent = typeof v === "number" && key.includes("delta") ? Math.round(v * 100) + "%" : String(v ?? "—");
    tr.append(td);
  }
  paired.append(tr);
}

// ---- hardness grid ----
const hardness = document.getElementById("hardness");
const hLevels = Object.keys(DATA.hardnessGrid || {}).sort();
const hHarnesses = [...new Set(DATA.rows.map((r) => r.harness))];
const hHead = el("tr");
hHead.append(el("th", {}, ["Level"]));
for (const h of hHarnesses) { const th = el("th"); th.textContent = h; hHead.append(th); }
hardness.append(hHead);
for (const level of hLevels) {
  const tr = el("tr");
  const name = el("td"); name.textContent = level; tr.append(name);
  for (const h of hHarnesses) {
    const td = el("td");
    const rate = DATA.hardnessGrid[level]?.[h];
    td.textContent = rate === null || rate === undefined ? "—" : Math.round(rate * 100) + "%";
    if (rate !== null && rate !== undefined) td.className = rate >= 0.5 ? "pass" : "fail";
    tr.append(td);
  }
  hardness.append(tr);
}

// ---- scorecard table ----
const scorecard = document.getElementById("scorecard");
const columns = [
  ["harness", "Harness"], ["model", "Model"], ["runs", "Runs"], ["task_runs", "Task runs"], ["pass_rate", "Pass rate"],
  ["wall_seconds_per_solved", "Sec/solve"], ["cost_per_solved", "$/solve"],
  ["setup_error_rate", "Setup errs"], ["timeout_rate", "Timeouts"], ["overclaim_rate", "Overclaims"],
  ["honest_failure_rate", "Honest fails"], ["retest_gain", "Retest gain"],
];
const headRow = el("tr");
for (const [, label] of columns) { const th = el("th"); th.textContent = label; headRow.append(th); }
scorecard.append(headRow);
for (const row of DATA.rows) {
  const tr = el("tr");
  for (const [key] of columns) {
    const td = el("td");
    let value = row[key];
    if (value === null || value === undefined) value = "—";
    else if (key.endsWith("_rate")) { td.className = key === "pass_rate" ? (value >= 0.5 ? "pass" : "fail") : (value > 0 ? "warn" : ""); value = Math.round(value * 100) + "%"; }
    else if (key === "retest_gain") { td.className = value > 0 ? "pass" : value < 0 ? "fail" : ""; value = (value > 0 ? "+" : "") + Math.round(value * 100) + "%"; }
    td.textContent = value;
    tr.append(td);
  }
  scorecard.append(tr);
}

// ---- per-task grid ----
const taskGrid = document.getElementById("taskgrid");
const tasks = [...new Set(DATA.results.map((r) => r.task))];
const gridHead = el("tr");
gridHead.append(el("th", {}, ["Task"]));
for (const harness of harnessList) for (const model of modelList) {
  const th = el("th"); th.textContent = harness + (modelList.length > 1 ? " / " + model : ""); gridHead.append(th);
}
taskGrid.append(gridHead);
for (const task of tasks) {
  const tr = el("tr");
  const taskResults = DATA.results.filter((r) => r.task === task);
  const nameTd = el("td");
  nameTd.textContent = task + " (" + (taskResults[0]?.hardness ?? "?") + ")";
  tr.append(nameTd);
  for (const harness of harnessList) for (const model of modelList) {
    const cellRuns = taskResults.filter((r) => r.harness === harness && r.model === model);
    const td = el("td");
    for (const run of cellRuns) {
      const dot = el("span", { class: "grid-dot", title: (run.phase !== "single" ? run.phase + " " : "") + "repeat " + run.repeat + ": " + (run.pass ? "pass" : run.setup_error ? "setup error" : run.timed_out ? "timeout" : "fail") + " " + run.wall_seconds + "s" + (run.overclaim ? " OVERCLAIM" : "") });
      dot.style.background = run.pass ? "#34d399" : run.setup_error ? "#9ca3af" : run.timed_out ? "#fbbf24" : "#f87171";
      if (run.overclaim) dot.style.outline = "2px solid #fbbf24";
      td.append(dot);
    }
    if (cellRuns.length === 0) td.textContent = "—";
    tr.append(td);
  }
  taskGrid.append(tr);
}
</script>
</body>
</html>
`;
