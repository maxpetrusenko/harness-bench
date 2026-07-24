import test from "node:test";
import assert from "node:assert/strict";
import { buildCliArgv } from "../src/runner.mjs";

test("buildCliArgv inserts model args after executable by default", () => {
  const argv = buildCliArgv(
    {
      command: ["claude", "-p", "{prompt}"],
      modelArgs: ["--model", "{model}"],
    },
    "fix it",
    "sonnet",
    "/tmp/work"
  );

  assert.deepEqual(argv, ["claude", "--model", "sonnet", "-p", "fix it"]);
});

test("buildCliArgv supports subcommand model arg placement", () => {
  const argv = buildCliArgv(
    {
      command: ["droid", "exec", "-o", "json", "--cwd", "{workspace}", "{prompt}"],
      modelArgs: ["-m", "{model}"],
      modelArgsIndex: 2,
    },
    "fix it",
    "gpt-5",
    "/tmp/work"
  );

  assert.deepEqual(argv, ["droid", "exec", "-m", "gpt-5", "-o", "json", "--cwd", "/tmp/work", "fix it"]);
});

test("buildCliArgv omits model args for the default model lane", () => {
  const argv = buildCliArgv(
    {
      command: ["goose", "run", "--text", "{prompt}"],
      modelArgs: ["--model", "{model}"],
      modelArgsIndex: 2,
    },
    "fix it",
    null,
    "/tmp/work"
  );

  assert.deepEqual(argv, ["goose", "run", "--text", "fix it"]);
});

test("buildCliArgv falls back safely for invalid modelArgsIndex", () => {
  const argv = buildCliArgv(
    {
      command: ["agent", "run", "{prompt}"],
      modelArgs: ["--model", "{model}"],
      modelArgsIndex: "bad",
    },
    "fix it",
    "m",
    "/tmp/work"
  );

  assert.deepEqual(argv, ["agent", "--model", "m", "run", "fix it"]);
});
