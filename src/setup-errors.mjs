const SETUP_ERROR_RULES = [
  ["auth_error", /failed to authenticate|authentication failed|error authenticating|authentication_error|invalid authentication credentials|api error:\s*401/i],
  ["account_tier", /ineligibletiererror|unsupported_client|client is no longer supported|ineligible tier/i],
  ["model_unavailable", /cannot use this model|model is not supported|unsupported model|unknown model/i],
  ["usage_limit", /usage limit|spend limit|monthly cycle|quota exceeded|rate limit/i],
  ["spawn_error", /spawn error|enoent|command not found/i],
  ["cli_usage_error", /unknown option|unknown argument|unrecognized option|unrecognized argument|invalid option|unexpected argument|usage:/i],
  ["runtime_crash", /unexpected error|typeerror|response\.headers|uncaught exception/i],
];

export const detectSetupError = ({ harness, stdout = "", stderr = "", exitCode = 0, timedOut = false }) => {
  if (harness.kind !== "cli" || timedOut || exitCode === 0) return null;
  const text = `${stdout}\n${stderr}`;
  for (const [kind, pattern] of SETUP_ERROR_RULES) {
    if (pattern.test(text)) {
      return {
        kind,
        message: firstUsefulLine(text, pattern) ?? kind,
      };
    }
  }
  return null;
};

const firstUsefulLine = (text, pattern) =>
  text
    .split("\n")
    .map((line) => cleanLine(line.trim()))
    .find((line) => line && pattern.test(line))
    ?.slice(0, 240);

const cleanLine = (line) => {
  if (!line.startsWith("{")) return line;
  try {
    const parsed = JSON.parse(line);
    return nestedMessage(parsed) ?? line;
  } catch {
    return line;
  }
};

const nestedMessage = (value) => {
  if (!value || typeof value !== "object") return null;
  const message = typeof value.message === "string" ? parseMaybeJsonMessage(value.message) : null;
  if (message) return message;
  if (typeof value.error?.message === "string") return value.error.message;
  if (typeof value.error === "string") return value.error;
  return null;
};

const parseMaybeJsonMessage = (message) => {
  if (!message.trim().startsWith("{")) return message;
  try {
    return nestedMessage(JSON.parse(message)) ?? message;
  } catch {
    return message;
  }
};
