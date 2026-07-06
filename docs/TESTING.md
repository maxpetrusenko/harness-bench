# Testing harness-bench

Bench version tracked in `package.json`. Every run appends to `runs/history.jsonl` with harness CLI versions and config hashes in `manifest.json`.

## Vertical slice flow (connected)

```text
calibrate → prototype suite → harness-compare → hard / qa → continuous repeats → history
```

| Step | Command | Proves |
|------|---------|--------|
| 1 | `npm run smoke` (= calibrate + prototype) | Pipeline + verifiers |
| 2 | `--suite harness-compare` | Same model, different harnesses |
| 3 | `--suite hard` | L3–L5 + retest + skills |
| 4 | `--suite qa` | Q&A track (model-bench style) |
| 5 | `--continuous 3` | Variance over repeated matrices |
| 6 | `harness-bench history` | Versioned run log |

---

## Category testing matrix

### Harness / model separation
- **Config:** harness runtime in `harnesses/*.json`; model lanes and per-harness model ids in `models/*.json`
- **Metric/artifact:** `manifest.json` `models[]`, `scores.csv` grouped by `harness,model`, `skipped-model-harnesses.csv`
- **Test:**
```bash
harness-bench run \
  --harnesses oracle,codex \
  --models sonnet,gpt \
  --tasks 01-create-file \
  --out runs/model-split-mixed
```
- **Expected:** `oracle` runs on both model lanes, `codex × gpt` runs, `codex × sonnet` is skipped with a reason.

### Outcome / quality
- **Tasks:** 01–04 (L0–L1), 08 (L3), 10 (L5), qa-01
- **Metric:** `pass`, `partial_credit`, category `outcome`, `quality`
- **Test:** `harness-bench run --tasks 01-create-file,08-add-retry-helper --harnesses oracle,claude`

### Honesty
- **Tasks:** 06-blocked-honesty, qa-02-honesty-unknown
- **Metric:** `overclaim_rate`, `honest_failure_rate`, category `honesty`
- **Test:** overclaim harness must score 100% overclaim; real harness on 06 should pass with REPORT.md not fake credentials

### Performance (speed)
- **Metric:** `wall_seconds`, `wall_seconds_per_solved`, category `performance`
- **Test:** compare harnesses on L0 task — faster harness should win on performance score even if both pass

### Cost
- **Metric:** `cost_usd`, `cost_per_solved`, category `cost_efficiency`
- **Test:** same model via opencode vs claude — cost spread is a harness signal (routing, turns, caching)

### Tool use
- **Metric:** `tool_calls`, `tool_errors`, `tool_recovery_rate`, category `tool_use`
- **Test:** L2+ terminal tasks; requires CLI JSON output (codex-jsonl, claude-json)

### Learning / retest
- **Tasks:** 03, 05, 10 with `--retest`
- **Metric:** `retest_gain`, `retest_improved`, category `learning`
- **Test:** `harness-bench run --suite hard --retest --tasks 10-transfer-summary`

### Context management
- **Tasks:** 09-stale-trap with `--context loaded50k`, `loaded100k`, or `conflict_context`
- **Metric:** pass rate fresh vs loaded50k, category `context_management`
- **Test:**
```bash
harness-bench run --tasks 09-stale-trap --context fresh --harnesses claude --out runs/stale-fresh
harness-bench run --tasks 09-stale-trap --context loaded50k --harnesses claude --out runs/stale-loaded
harness-bench run --tasks 09-stale-trap --context loaded100k --harnesses claude --out runs/stale-100k
harness-bench run --tasks 09-stale-trap --context conflict_context --harnesses claude --out runs/stale-conflict
```

### Skills
- **Metric:** paired pass delta with `--skills on` vs off
- **Test:** `harness-bench run --tasks 05-find-root-cause --skills on --harnesses claude`

### Observation / image
- **Tasks:** 07-screenshot-state
- **Test:** requires multimodal harness or screenshot read via tools

### Thinking
- **Tasks:** qa-03-reasoning-trap (0.10 trap), 05-find-root-cause
- **Metric:** `partial_credit` on trap answer

---

## Hardness ladder

| Level | Tasks | What it stresses |
|-------|-------|------------------|
| L0 | 01, qa-01 | Smoke / exact output |
| L1 | 02–04 | Routine debug |
| L2 | 05–07, 06, qa-02/03 | Investigation, honesty, image |
| L3 | 08 | Multi-step feature + tests |
| L4 | 09 | Stale context adversarial |
| L5 | 10 | Transfer from LESSON.md |

Report includes **pass rate by hardness** table (`hardness.json`).

---

## Q&A track vs terminal track

**Terminal** (`tasks/`): file edits, shell, verifiers on workspace state.

**Q&A** (`tasks/qa/`): write `answer.txt` only — like MMLU/HumanEval style but **harness is the variable**, not model. Use when you want to isolate answer quality without tool noise.

```bash
harness-bench run --suite qa
```

---

## Continuous runs (same prompts, repeated)

```bash
harness-bench run --suite harness-compare --continuous 5 --out runs/compare-continuous
```

Each full matrix repetition gets `continuous_sequence` 1..n in results. Use for variance / reliability studies.

---

## SDK mode

```bash
npm run sdk:smoke
```

Programmatic users can import `runHarnessBench()` from `src/sdk.mjs` or package export `"."`.

---

## External imports

```bash
harness-bench import --from terminal-bench --source /path/to/tasks --name tb-local
harness-bench import --from swe-bench --source /path/to/data --name swe-local
```

Imported tasks are shells. They require local fixtures and `verify.sh.local` before scored use.

---

## Paired stats

Every report with at least two harnesses writes `paired-stats.csv`:

- `pass_delta_b_minus_a`
- approximate `ci95_low` / `ci95_high`
- paired wins/losses/ties on matched task/repeat/phase cells

---

## Version history

```bash
harness-bench history
```

`manifest.json` per run stores:
- `bench_version`, git sha
- per-harness CLI `--version` string + config hash
- per-model registry id, provider, label, and config hash
- skipped harness/model pairs when a model lane is not supported by a harness
- per-task `task_hash`

Compare runs over time:
```bash
diff runs/compare-1/manifest.json runs/compare-2/manifest.json
```

---

## LLM judge?

**Not used for headline scores.** Deterministic verifiers + regex honesty only.

Optional future: LLM judge for failure clustering and prose handoff — never replace `verify.sh`.

---

## Prototype harness discrimination (minimal tokens)

```bash
# 1. Calibrate (free)
harness-bench calibrate

# 2. One real harness vs oracle on L0
harness-bench run --harnesses oracle,claude --tasks 01-create-file --models sonnet --out runs/probe

# 3. Full compare
harness-bench run --suite harness-compare --out runs/compare-$(date +%Y%m%d)
```

Healthy signal: pass rates or costs differ between claude / cursor-agent / opencode at same `sonnet` model.

---

## Optional future extensions

- LLM judge (secondary only)
- Fable worker harness adapter (planning agent, not runtime CLI)
