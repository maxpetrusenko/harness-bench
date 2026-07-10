import fs from "node:fs";
import path from "node:path";

const readJsonl = (file) =>
  fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));

export const writeInspectExport = ({ runDir, outFile = null }) => {
  const resolved = path.resolve(runDir);
  const resultsPath = path.join(resolved, "results.jsonl");
  if (!fs.existsSync(resultsPath)) throw new Error(`No results.jsonl in ${resolved}`);

  const results = readJsonl(resultsPath);
  const target = outFile ? path.resolve(outFile) : path.join(resolved, "inspect-ai-samples.jsonl");
  const lines = results.map((result) =>
    JSON.stringify({
      id: result.run_id,
      input: result.task,
      target: result.pass ? "pass" : "fail",
      scores: {
        pass: result.pass ? 1 : 0,
        partial_credit: result.partial_credit,
        overclaim: result.overclaim ? 1 : 0,
        setup_error: result.setup_error ? 1 : 0,
      },
      metadata: {
        harness: result.harness,
        model: result.model,
        model_id: result.model_id,
        task: result.task,
        track: result.track,
        hardness: result.hardness,
        context: result.context,
        skills: result.skills,
        phase: result.phase,
        repeat: result.repeat,
        wall_seconds: result.wall_seconds,
        cost_usd: result.cost_usd,
        tokens_in: result.tokens_in,
        tokens_out: result.tokens_out,
        tool_calls: result.tool_calls,
        tool_errors: result.tool_errors,
        setup_error_kind: result.setup_error_kind,
      },
    })
  );

  fs.writeFileSync(target, `${lines.join("\n")}\n`);
  return { outFile: target, samples: results.length };
};
