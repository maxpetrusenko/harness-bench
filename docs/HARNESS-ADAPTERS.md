# Harness Adapter Notes

Read when: adding or changing `harnesses/*.json` or `models/*.json`.

## Adapter contract

Harness configs describe the runtime:

- executable and arguments
- cwd behavior
- output parser hint
- optional model flag insertion
- static capability tags
- install/uninstall notes for `doctor`

Model configs describe model lanes. Do not put model identity in a harness config except the placeholder passed through `modelArgs`.

By default, `modelArgs` are inserted after the executable:

```json
["claude", "--model", "{model}", "-p", "{prompt}"]
```

For subcommand CLIs, set `modelArgsIndex`:

```json
{
  "command": ["droid", "exec", "-o", "json", "{prompt}"],
  "modelArgs": ["-m", "{model}"],
  "modelArgsIndex": 2
}
```

## Current researched adapters

| Harness | Source | Benchmark shape |
|---|---|---|
| Aider | https://aider.chat/docs/scripting.html and https://aider.chat/docs/config/options.html | `aider --message ... --model ...` |
| Goose | https://goose-docs.ai/docs/guides/goose-cli-commands/ | `goose run ...` with JSON/text output options |
| Continue | https://docs.continue.dev/guides/cli | headless prompt mode with model slug |
| Kilo | https://kilo.ai/docs/code-with-ai/platforms/cli-reference | `kilo run` with `--model provider/model` and JSON output |
| Copilot CLI | https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli | prompt-driven CLI; isolate benchmark workspace before broad tool permissions |
| Factory Droid | https://docs.factory.ai/cli/getting-started/quickstart | Droid CLI benchmark lane; requires Factory auth |
| Crush | https://github.com/charmbracelet/crush | terminal coding agent; verify local noninteractive syntax before paid matrix runs |
| OpenHands | https://docs.openhands.dev/openhands/usage/cli/quick-start | headless autonomous agent lane |
| Qwen Code | https://qwenlm.github.io/qwen-code-docs/en/users/features/headless/ | headless `-p` style prompt lane |

## Add a harness

1. Add `harnesses/<id>.json`.
2. Add capability tags conservatively.
3. Add at least one model mapping in `models/*.json`.
4. Run:

```bash
node bin/harness-bench.mjs list
node bin/harness-bench.mjs doctor --harnesses <id>
npm test
```

Do not install or uninstall global CLIs inside CI or daily radar jobs. Use `doctor` to show the lifecycle command, then do install/removal only in an explicit benchmark-prep run.
