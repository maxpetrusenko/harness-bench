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

const asNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/^\$/, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const walkObjects = (value, seen = new Set()) => {
  if (!value || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);
  const objects = [value];
  for (const child of Object.values(value)) {
    if (child && typeof child === "object") objects.push(...walkObjects(child, seen));
  }
  return objects;
};

const collectObjects = (stdout) => {
  const objects = [];
  const whole = safeParse(stdout.trim());
  if (whole) objects.push(whole);
  else objects.push(...parseJsonLines(stdout));
  return objects.flatMap((obj) => walkObjects(obj));
};

const firstNumber = (obj, keys) => {
  for (const key of keys) {
    const value = asNumber(obj[key]);
    if (value !== null) return value;
  }
  return null;
};

export const extractMetrics = (stdout, parseHint) => {
  const metrics = { costUsd: null, tokensIn: null, tokensOut: null };
  const objects = collectObjects(stdout);

  for (const obj of objects) {
    const cost = firstNumber(obj, [
      "total_cost_usd",
      "cost_usd",
      "total_cost",
      "cost",
      "usd",
      "estimated_cost_usd",
    ]);
    if (cost !== null) metrics.costUsd = cost;

    const tokensIn = firstNumber(obj, [
      "input_tokens",
      "input",
      "prompt_tokens",
      "promptTokenCount",
      "cache_read_input_tokens",
      "cached_input_tokens",
    ]);
    const tokensOut = firstNumber(obj, [
      "output_tokens",
      "output",
      "completion_tokens",
      "candidatesTokenCount",
      "response_tokens",
    ]);
    if (tokensIn !== null) metrics.tokensIn = (metrics.tokensIn ?? 0) + tokensIn;
    if (tokensOut !== null) metrics.tokensOut = (metrics.tokensOut ?? 0) + tokensOut;
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
