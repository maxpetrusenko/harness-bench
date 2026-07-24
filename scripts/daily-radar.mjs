#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadHarnesses, loadModels, loadTasks } from "../src/config.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const boolCount = (items, key) => items.filter((item) => item.capabilities?.[key]).length;

const modelCoverage = (harnesses, models) =>
  harnesses
    .filter((harness) => harness.kind === "cli")
    .map((harness) => {
      const mapped = models.filter((model) => model.id === "default" || model.harnesses?.[harness.id]).map((model) => model.id);
      return { harness: harness.id, mapped_models: mapped };
    });

const capabilityGaps = (harnesses) => {
  const cliHarnesses = harnesses.filter((harness) => harness.kind === "cli");
  return [
    { capability: "reads_images", current: boolCount(cliHarnesses, "reads_images"), needed_for: "07-screenshot-state" },
    { capability: "mcp", current: boolCount(cliHarnesses, "mcp"), needed_for: "tool and context orchestration" },
    { capability: "browser", current: boolCount(cliHarnesses, "browser"), needed_for: "future web tasks" },
    { capability: "lsp", current: boolCount(cliHarnesses, "lsp"), needed_for: "IDE harness comparison" },
  ];
};

const nextProposal = (coverage, gaps) => {
  const leastMapped = [...coverage].sort((a, b) => a.mapped_models.length - b.mapped_models.length)[0];
  const imageGap = gaps.find((gap) => gap.capability === "reads_images");
  if (imageGap?.current < 4) {
    return "Add one image-observation task and verify which harnesses can pass it with the same model lane.";
  }
  if (leastMapped && leastMapped.mapped_models.length < 2) {
    return `Add or verify another model mapping for ${leastMapped.harness}, then run a two-model harness-only smoke.`;
  }
  return "Import one Terminal-Bench shell and convert it into a deterministic L3 task with verify.sh.";
};

const renderMarkdown = ({ harnesses, models, tasks, coverage, gaps }) => {
  const lines = [
    "# harness-bench daily radar",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Inventory",
    "",
    `- Harnesses: ${harnesses.length} (${harnesses.filter((h) => h.kind === "cli").length} CLI, ${harnesses.filter((h) => h.kind !== "cli").length} toy)`,
    `- Model lanes: ${models.length}`,
    `- Tasks: ${tasks.length}`,
    "",
    "## Harness model coverage",
    "",
    "| Harness | Model lanes |",
    "|---|---|",
  ];
  for (const row of coverage) lines.push(`| ${row.harness} | ${row.mapped_models.join(", ") || "none"} |`);

  lines.push("", "## Capability gaps", "", "| Capability | Harnesses | Needed for |", "|---|---:|---|");
  for (const gap of gaps) lines.push(`| ${gap.capability} | ${gap.current} | ${gap.needed_for} |`);

  lines.push("", "## Suggested next PR", "", `- ${nextProposal(coverage, gaps)}`, "");
  lines.push("## Review gate", "");
  lines.push("- Run `npm test`, `npm run sdk:smoke`, and `npm run smoke` before merging.");
  lines.push("- Use autoreview skills before approval: `agent-learning-loop`, `gstack-autoplan`, `gstack-review`, `github-code-review`.");
  lines.push("- Do not install paid/global harness CLIs during radar; scored cells are explicit benchmark runs only.");
  return lines.join("\n");
};

const parseArgs = (argv) => {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--out") {
      options.out = argv[i + 1];
      i += 1;
    }
  }
  return options;
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const harnesses = loadHarnesses(ROOT);
  const models = loadModels(ROOT);
  const tasks = loadTasks(ROOT);
  const coverage = modelCoverage(harnesses, models);
  const gaps = capabilityGaps(harnesses);
  const markdown = renderMarkdown({ harnesses, models, tasks, coverage, gaps });
  if (options.out) {
    const outPath = path.resolve(ROOT, options.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, markdown);
    console.log(outPath);
  } else {
    console.log(markdown);
  }
};

main();
