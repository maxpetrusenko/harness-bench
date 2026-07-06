# harness-bench

Measure **agent harnesses**, not models.

Same tasks + same model + same budget → compare **Claude Code**, **Cursor agent**, **Codex CLI**, **Droid**, **OpenCode** (OpenRouter), **Gemini CLI**, and your own harness.

## What this is

```text
agent result = model + harness + task + budget + verifier
```

Public leaderboards mostly swap models. This tool holds the model constant and varies the **harness** — the execution layer (context packing, tool loop, recovery, honesty, artifact contracts).

Codex presearch lives in `docs/`:
- `docs/harness-meter-brainlift-presearch.md` — landscape, MVP slices, CLI shape
- `docs/harness-bench-scientific-protocol.md` — image, skills, retest, honesty, context conditions

## Completion status

`harness-bench` v1.1.0 is complete as a local scientific harness-benchmark prototype:

- deterministic task verifiers
- toy calibration harnesses
- real CLI harness adapters
- first-class model registry in `models/*.json`
- SDK entrypoint
- Terminal-Bench / SWE-bench import shells
- context conditions: `fresh`, `loaded50k`, `loaded100k`, `conflict_context`
- skills on/off
- same-task retest
- image-lite and Q&A tracks
- category scores
- paired pass-delta stats
- versioned manifests and history

## Quick start

```bash
cd ~/Desktop/Projects/harness-bench

# 1. Free pipeline test (no API tokens — toy harnesses only)
npm run smoke

# 2. Open the HTML report with grouped bar charts
open runs/*/report.html   # pick the newest timestamp dir
```

Smoke uses `oracle` (always passes), `noop` (honest fail), `overclaim` (claims success without doing work). Confirms runner, verifiers, honesty detection, and charts work.

## Harnesses and models are separate

Harness configs describe the runtime only: command, parser, cwd, and model flag shape. Model configs live in `models/*.json` and describe which harnesses can run each model lane.

```text
harnesses/codex.json       -> how to invoke Codex CLI
models/gpt.json            -> Codex uses gpt-5.3-codex, Cursor uses gpt-5, OpenCode uses openai/gpt-5
```

Run `list` to see both dimensions:

```bash
node bin/harness-bench.mjs list
```

Current model lanes:

| Canonical | claude | cursor-agent | codex | opencode (OpenRouter) |
|-----------|--------|--------------|-------|------------------------|
| `sonnet`  | sonnet | sonnet-4.5   | —     | anthropic/claude-sonnet-4-5 |
| `gpt`     | —      | gpt-5        | gpt-5.3-codex | openai/gpt-5 |

If a harness has no mapping for a requested model, that harness/model pair is skipped before execution and written to `skipped-model-harnesses.csv`.

## Compare harnesses across model lanes

```bash
# Same Sonnet across Claude Code vs Cursor vs OpenCode
node bin/harness-bench.mjs run \
  --harnesses claude,cursor-agent,opencode \
  --models sonnet \
  --tasks 01-create-file,02-fix-syntax-error \
  --repeats 1 \
  --out runs/sonnet-compare

open runs/sonnet-compare/report.html
```

```bash
# Cross model lanes in one run. Invalid pairs are skipped, not failed.
node bin/harness-bench.mjs run \
  --harnesses claude,codex,cursor-agent,opencode \
  --models sonnet,gpt \
  --tasks 01-create-file,06-blocked-honesty \
  --out runs/harness-model-matrix
```

```bash
# Full L0–L2 matrix, 3 repeats (costs real tokens)
node bin/harness-bench.mjs run \
  --harnesses claude,cursor-agent,codex,droid,opencode \
  --models sonnet \
  --hardness L0,L1,L2 \
  --repeats 3 \
  --out runs/full-sonnet
```

```bash
# Skills + loaded context (50k-token distractor file)
node bin/harness-bench.mjs run \
  --harnesses claude,codex \
  --models default \
  --skills on \
  --context loaded50k \
  --out runs/context-skills

# Same-task retest (Round A → PRIOR_RUN.md → Round B)
node bin/harness-bench.mjs run \
  --harnesses claude,cursor-agent \
  --models sonnet \
  --tasks 03-fix-failing-test,05-find-root-cause \
  --retest \
  --out runs/retest-learning
```

## Output

Each run writes:

```text
runs/<name>/
  manifest.json      # frozen config
  results.jsonl      # one JSON object per cell
  scores.csv         # aggregated by harness × model
  skipped-model-harnesses.csv
                    # requested pairs with no model mapping
  paired-stats.csv   # paired harness deltas on matched cells
  failures.md        # clustered failure fingerprints
  report.html        # bar charts + scorecard + per-task grid
  cells/             # stdout, stderr, workspace per run
```

### Charts (report.html)

- **Pass rate by harness** — grouped bars per model (the main comparison)
- **Wall seconds per solved task**
- **Cost per solved task** (when CLI reports usage)
- **Scorecard** — timeouts, overclaims, honest failures, retest gain
- **Per-task grid** — green/red dots per harness × model × task

## Tasks (13)

| Id | Level | Domain | What it tests |
|----|-------|--------|---------------|
| 01-create-file | L0 | terminal | Exact artifact creation |
| 02-fix-syntax-error | L1 | terminal | Read + fix |
| 03-fix-failing-test | L1 | terminal | Test-driven debug |
| 04-json-transform | L1 | terminal | Data transform |
| 05-find-root-cause | L2 | terminal | Misleading error, wrong-file trap |
| 06-blocked-honesty | L2 | terminal | Impossible task → honest REPORT.md |
| 07-screenshot-state | L2 | image-lite | Read error code from screenshot.png |
| 08-add-retry-helper | L3 | terminal | Multi-step feature + tests |
| 09-stale-trap | L4 | terminal | Ignore stale context, trust live config |
| 10-transfer-summary | L5 | terminal | Transfer prior aggregation pattern |
| qa-01-exact-answer | L0 | qa | Exact answer quality |
| qa-02-honesty-unknown | L2 | qa | Refuse unknowable fact |
| qa-03-reasoning-trap | L2 | qa | Avoid tempting wrong answer |

## Harnesses

```bash
node bin/harness-bench.mjs list
```

| Id | Type | CLI |
|----|------|-----|
| claude | real | `claude -p --output-format json` |
| cursor-agent | real | `cursor-agent -p --output-format json` |
| codex | real | `codex exec --json` |
| droid | real | `droid exec -o json` |
| opencode | real | `opencode run` (OpenRouter model ids) |
| gemini | real | `gemini -o json` |
| oracle / noop / overclaim | toy | pipeline smoke only |

Add your harness: drop `harnesses/my-harness.json` following the schema in `harnesses/claude.json`.

Add a model lane: drop `models/my-model.json`:

```json
{
  "id": "my-model",
  "label": "My model lane",
  "provider": "provider-name",
  "harnesses": {
    "my-harness": "provider/model-id-for-this-cli"
  }
}
```

## CLI reference

```bash
harness-bench run [options]
harness-bench list
harness-bench report <runDir>    # rebuild report from results.jsonl
```

Options: `--harnesses`, `--models`, `--tasks`, `--hardness`, `--track`, `--repeats`, `--context fresh|loaded50k|loaded100k|conflict_context`, `--skills off|on`, `--retest`, `--timeout`, `--out`, `--concurrency`.

## SDK mode

```js
import { runHarnessBench } from "harness-bench";

const run = await runHarnessBench({
  harnesses: ["claude", "codex"],
  models: ["default"],
  tasks: ["01-create-file", "06-blocked-honesty"],
  outDir: "runs/sdk-real"
});

console.log(run.reportPath);
```

Smoke:

```bash
npm run sdk:smoke
```

## External task imports

Create local task shells from external datasets:

```bash
node bin/harness-bench.mjs import --from terminal-bench --source /path/to/terminal-bench/tasks --name tb-local
node bin/harness-bench.mjs import --from swe-bench --source /path/to/swe-bench/data --name swe-local
```

Imported task shells intentionally require `verify.sh.local` before they can pass; this prevents accidental unverified leaderboard claims.

## Metrics

**Primary (deterministic):**
- `pass_rate` — oracle verifier
- `wall_seconds_per_solved`
- `cost_per_solved` — parsed from CLI JSON when available
- `timeout_rate`, `overclaim_rate`, `honest_failure_rate`
- `retest_gain` — pass rate Round B minus Round A
- `pass_delta_b_minus_a` — paired harness delta in `paired-stats.csv`

**Honesty:** agents that claim success when the verifier fails get flagged `[OVERCLAIM]` even if you'd eyeball the stdout as confident.

## Codex review summary

Codex's presearch is solid. Key takeaways already baked in:

| Codex recommendation | Status here |
|---------------------|-------------|
| Minibench before Terminal-Bench | ✅ 13 local tasks |
| Same model × multiple harnesses | ✅ matrix runner |
| Clean harness/model split | ✅ `harnesses/*.json` + `models/*.json` |
| Deterministic verifiers first | ✅ bash verify.sh |
| Skills on/off | ✅ `--skills` |
| Context load test | ✅ `--context loaded50k` |
| 100k/conflict context | ✅ `--context loaded100k|conflict_context` |
| Same-task retest | ✅ `--retest` |
| Honesty adversarial task | ✅ 06-blocked-honesty |
| Image-lite | ✅ 07-screenshot-state |
| HTML comparison report | ✅ grouped bar charts |
| Terminal-Bench adapter | ✅ import shell |
| SWE-bench adapter | ✅ import shell |
| SDK mode | ✅ `runHarnessBench()` |
| Paired stats | ✅ `paired-stats.csv` |
| Inspect AI integration | optional future substrate |
| Failure fingerprints | ✅ failures.md |

**Not the same thing:** Fable (planning agent in Cursor) vs Claude Code vs Cursor agent — Fable is a *worker*, these harness configs are *runtimes*. To compare Fable you'd add a harness adapter that invokes Fable with the same task prompt.

## Prior art (OSS)

- [scaffold-effects](https://github.com/namanvats/scaffold-effects) — Goose/OpenCode/OpenHands on Terminal-Bench
- [Harness-Bench paper](https://arxiv.org/html/2605.27922v1) — harness-as-variable framing
- [HAL harness](https://github.com/princeton-pli/hal-harness) — archived, good reference
- [Inspect AI](https://inspect.aisi.org.uk/) — eval substrate for later
- Domain benches: Terminal-Bench, BrowserGym, tau2-bench, ToolSandbox

## Requirements

- Node ≥ 18
- Installed CLIs for harnesses you want to test (`command -v claude cursor-agent codex …`)
- API auth configured for those CLIs (uses your existing login/keys)

## License

MIT
