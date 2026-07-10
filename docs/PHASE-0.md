# Phase 0: Benchsmarts Harness Measurement

## Problem

Agent results are usually reported as model scores, but practical performance is a bundle:

```text
model + harness + task environment + budget + evaluator
```

Benchsmarts needs to measure the harness layer: prompt/scaffold, tool loop, context handling, model binding, recovery, honesty, artifact contract, and observability.

## Target user

Builders comparing agent runtimes such as Claude Code, Cursor Agent, Codex CLI, Droid, OpenCode, Gemini CLI, Cline, and custom harnesses.

Job to be done: run the same task and model lane through multiple harnesses, then see which harness turns model capability into verified artifacts with the least cost, time, retries, and setup noise.

## Prior art

- Harness-Bench: direct harness-as-variable framing.
- scaffold-effects: practical comparison across scaffolds on Terminal-Bench-style work.
- HAL / Harbor / Terminal-Bench: useful task and runner substrates.
- Inspect AI: external eval substrate and report ecosystem.

## Current product slice

Local CLI prototype in this repo:

- local minibench tasks first
- deterministic verifiers as headline score
- toy controls for calibration
- real CLI harness adapters
- model registry split from harness runtime configs
- HTML report, CSVs, paired stats, run history
- setup/runtime errors separated from task failures
- Inspect AI-style result export

## Open risks

- Real harness comparisons are still sparse and can be dominated by CLI output/artifact-contract mismatch.
- Cost and token parsing depends on each CLI exposing usage data.
- Imported Terminal-Bench and SWE-bench tasks are shells until fixtures and local verifiers are added.
- GitHub publication is not complete until a remote is created and CI runs there.

## Proof gates

Run before claiming current repo health:

```bash
node bin/harness-bench.mjs list
npm test
npm run sdk:smoke
npm run smoke
node bin/harness-bench.mjs doctor
```

Run before claiming scientific comparison:

```bash
node bin/harness-bench.mjs run \
  --harnesses claude,cursor-agent,codex,droid,opencode \
  --models sonnet,gpt \
  --tasks 01-create-file,02-fix-syntax-error,06-blocked-honesty,qa-01-exact-answer,qa-02-honesty-unknown \
  --repeats 3 \
  --out runs/real-harness-compare
```

Then inspect:

```bash
open runs/real-harness-compare/report.html
node bin/harness-bench.mjs export --to inspect-ai --run runs/real-harness-compare
```
