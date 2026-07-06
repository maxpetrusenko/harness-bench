// Best-effort extraction of cost/tokens/final-message from heterogeneous CLI output.
// Each harness config declares a "parse" hint: claude-json | cursor-json |
// codex-jsonl | gemini-json | opencode-jsonl | droid-json | text

const safeParse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const parseJsonLines = (stdout) =>
  stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{"))
    .map(safeParse)
    .filter(Boolean);

export { safeParse, parseJsonLines };

export const extractMetrics = (stdout, parseHint) => {
  const metrics = { costUsd: null, tokensIn: null, tokensOut: null };
  const objects = [];

  const whole = safeParse(stdout.trim());
  if (whole) objects.push(whole);
  objects.push(...parseJsonLines(stdout));

  for (const obj of objects) {
    const usage = obj.usage ?? obj.info?.tokens ?? obj.msg?.info?.total_token_usage ?? null;
    const cost =
      obj.total_cost_usd ?? obj.cost_usd ?? obj.total_cost ?? obj.stats?.cost ?? obj.info?.cost ?? null;
    if (typeof cost === "number") metrics.costUsd = cost;
    if (usage) {
      const tokensIn = usage.input_tokens ?? usage.input ?? usage.prompt_tokens ?? usage.promptTokenCount ?? null;
      const tokensOut =
        usage.output_tokens ?? usage.output ?? usage.completion_tokens ?? usage.candidatesTokenCount ?? null;
      if (typeof tokensIn === "number") metrics.tokensIn = tokensIn;
      if (typeof tokensOut === "number") metrics.tokensOut = tokensOut;
    }
  }
  return metrics;
};

export const extractFinalText = (stdout, parseHint) => {
  const whole = safeParse(stdout.trim());
  if (whole) {
    const candidate = whole.result ?? whole.response ?? whole.text ?? whole.output ?? null;
    if (typeof candidate === "string") return candidate;
  }
  const lines = parseJsonLines(stdout);
  let lastText = "";
  for (const obj of lines) {
    const candidate =
      obj.result ??
      obj.text ??
      obj.message?.content?.map?.((c) => c.text ?? "").join("") ??
      (obj.type === "item.completed" && obj.item?.type === "agent_message" ? obj.item.text : null) ??
      (obj.type === "assistant" ? obj.message?.content : null) ??
      null;
    if (typeof candidate === "string" && candidate.trim()) lastText = candidate;
  }
  if (lastText) return lastText;
  // Plain-text CLIs: use the trailing portion of stdout.
  return stdout.trim().slice(-3000);
};

const SUCCESS_PATTERNS = [
  /\ball tests pass/i,
  /\btests? (?:are |is |now )?(?:passing|green)\b/i,
  /\btask (?:is )?(?:fully )?complete\b/i,
  /\bsuccessfully (?:fixed|implemented|completed|created)\b/i,
  /\b(?:everything|it) (?:is |now )?(?:done|works|working)\b/i,
  /\bfixed the (?:bug|issue|test|problem)\b/i,
  /\bdone\.\s*$/i,
  /^done\b/i,
  /\bverified\b/i,
  /\bcreated\b.*\b(?:file|output)\b/i,
];

const BLOCKER_PATTERNS = [
  /\bblocked\b/i,
  /\bunable to\b/i,
  /\bcould not\b/i,
  /\bcouldn't\b/i,
  /\bfailed to\b/i,
  /\bnot (?:able|possible)\b/i,
  /\bran out of\b/i,
  /\bgave up\b/i,
  /\bstill failing\b/i,
];

export const detectSuccessClaim = (text) => SUCCESS_PATTERNS.some((pattern) => pattern.test(text));
export const detectBlockerReport = (text) => BLOCKER_PATTERNS.some((pattern) => pattern.test(text));
