import { safeParse, parseJsonLines } from "./metrics.mjs";

const walkObjects = (value, seen = new Set()) => {
  if (!value || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);
  const objects = [value];
  for (const child of Object.values(value)) {
    if (child && typeof child === "object") objects.push(...walkObjects(child, seen));
  }
  return objects;
};

const isToolEvent = (obj) => {
  const type = obj.type ?? obj.event ?? obj.kind ?? "";
  const name = type.toLowerCase();
  return (
    name.includes("tool") ||
    name.includes("function_call") ||
    name.includes("exec_command") ||
    name.includes("shell_call") ||
    obj.call?.tool_name !== undefined ||
    obj.tool !== undefined ||
    obj.tool_name !== undefined ||
    obj.function?.name !== undefined ||
    obj.name === "exec_command"
  );
};

const isToolError = (obj) => {
  const status = String(obj.status ?? obj.result ?? obj.outcome ?? "").toLowerCase();
  const text = JSON.stringify(obj).toLowerCase();
  return status.includes("error") || status.includes("fail") || text.includes('"is_error":true');
};

export const parseEvents = (stdout, parseHint) => {
  const events = [];
  const objects = [];
  const whole = safeParse(stdout.trim());
  if (whole) objects.push(whole);
  else objects.push(...parseJsonLines(stdout));

  for (const obj of objects.flatMap((entry) => walkObjects(entry))) {
    if (isToolEvent(obj)) {
      events.push({
        kind: "tool",
        name:
          obj.tool ??
          obj.tool_name ??
          obj.call?.tool_name ??
          obj.function?.name ??
          obj.item?.name ??
          obj.item?.type ??
          obj.name ??
          "unknown",
        status: isToolError(obj) ? "error" : "ok",
      });
    }
    if (obj.type === "item.completed" && obj.item?.type) {
      events.push({ kind: obj.item.type, status: "ok" });
    }
  }

  // Fallback: count bash/shell mentions in plain text for text-mode CLIs
  if (events.length === 0 && stdout.length > 0) {
    const shellHits = (stdout.match(/\b(ran|executed|running)\b.*\b(bash|shell|command|npm|node|pytest)\b/gi) ?? []).length;
    if (shellHits > 0) events.push({ kind: "tool_inferred", name: "shell", status: "ok", count: shellHits });
  }

  const toolEvents = events.filter((e) => e.kind === "tool" || e.kind === "tool_inferred");
  const toolErrors = toolEvents.filter((e) => e.status === "error").length;
  let recovered = 0;
  for (let i = 0; i < toolEvents.length - 1; i += 1) {
    if (toolEvents[i].status === "error" && toolEvents[i + 1].status === "ok") recovered += 1;
  }

  return {
    tool_calls: toolEvents.length,
    tool_errors: toolErrors,
    recovered_tool_errors: recovered,
    tool_recovery_rate: toolErrors > 0 ? recovered / toolErrors : null,
    events,
  };
};
