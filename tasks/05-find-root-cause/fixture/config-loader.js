import fs from "node:fs";

const DEFAULTS = {
  maxRetries: 0,
  endpoint: "mock://records",
};

export const loadConfig = () => {
  const raw = JSON.parse(fs.readFileSync(new URL("./settings.json", import.meta.url), "utf8"));
  return { ...DEFAULTS, ...raw };
};
