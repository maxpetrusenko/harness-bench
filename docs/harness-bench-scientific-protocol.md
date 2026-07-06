# Harness Bench Scientific Protocol

Date: 2026-07-05

## Thesis

Harness Bench should measure whether an agent system turns capability into verified progress.

The unit under test is not just:

```text
model
```

It is:

```text
model x harness x execution mode x context condition x skill pack x task hardness
```

The question:

```text
Which harness makes the same model observe better, choose better tools, progress through loops, learn from prior runs, preserve honesty, and produce better artifacts under controlled conditions?
```

## Experimental Cell

Every run must be labeled with this full coordinate:

```json
{
  "model": "openai/gpt-5.3",
  "harness": "my-harness",
  "execution_mode": "cli",
  "task_domain": "terminal",
  "hardness": "L2",
  "context_condition": "fresh",
  "skill_condition": "skills_on",
  "memory_condition": "episodic_memory_off",
  "repeat_index": 1,
  "budget": {
    "turns": 40,
    "tokens": 200000,
    "timeout_seconds": 1800
  }
}
```

Do not publish a score without this coordinate.

## Measurement Families

### 1. Outcome Quality

What was produced?

Metrics:

- `oracle_pass`: deterministic verifier passed.
- `partial_credit`: task-specific subgoals completed.
- `artifact_validity`: required files, screenshots, reports, diffs, or outputs exist and validate.
- `output_quality`: final answer is clear, complete, grounded, and useful.
- `input_comprehension`: agent understood user constraints and hidden traps.
- `regression_absence`: solution did not break existing behavior.

Scoring:

```text
0 = no meaningful output
1 = output exists but wrong
2 = partial useful output
3 = complete output with issues
4 = complete and verified
5 = complete, verified, minimal, maintainable
```

### 2. Observation Quality

Did it see the right things?

This includes images, screenshots, browser state, terminal output, files, repo state, and prior traces.

Metrics:

- `image_observation_accuracy`: identifies relevant UI/image facts.
- `screen_state_tracking`: knows what UI state changed after actions.
- `file_state_tracking`: notices actual file changes and errors.
- `terminal_output_use`: responds to exact command output instead of ignoring it.
- `source_grounding`: cites or references observed evidence.
- `false_observation_rate`: claims it saw something not present.

Image test types:

- screenshot with visible error
- screenshot with misleading filename
- chart/table extraction
- UI state before/after click
- visual diff
- generated image quality check
- image plus text contradiction

### 3. Tool-Use Quality

Did it use tools competently?

Metrics:

- `tool_selection_quality`: chose the right tool for the job.
- `tool_minimality`: avoided unnecessary expensive or risky calls.
- `tool_argument_correctness`: passed valid paths, flags, selectors, schemas.
- `tool_feedback_integration`: changed behavior after tool errors.
- `tool_sequence_efficiency`: used tools in a coherent order.
- `destructive_tool_avoidance`: did not use dangerous commands without need.
- `mode_fit`: used CLI/SDK/IDE affordances appropriately.

Bad patterns:

- reruns same failing command with no change
- ignores exact error text
- uses browser when CLI has exact data
- uses string grep where structured parser exists
- edits before reading local conventions
- claims tool success without checking output

### 4. Loop Progression

Does the agent move through a sane work loop?

Expected loop:

```text
orient -> inspect -> plan -> act -> verify -> adjust -> close
```

Metrics:

- `phase_order_score`: follows a sensible phase sequence.
- `stuck_loop_rate`: repeats actions without new information.
- `verification_density`: verifies after meaningful changes.
- `hypothesis_update_rate`: updates plan when evidence contradicts it.
- `checkpoint_quality`: summarizes state before expanding scope.
- `closure_integrity`: final answer matches actual verified state.

Loop progression event model:

```json
{
  "phase": "verify",
  "evidence": "pytest failed: missing async fixture",
  "next_phase": "adjust",
  "quality": 4
}
```

### 5. Learning Capability

Does performance improve when the same or analogous task appears again?

There are three separate learning modes:

| Mode | Description | What it tests |
| --- | --- | --- |
| `in-run_learning` | Learns within one trajectory after errors | Recovery and hypothesis updating |
| `same-task_retest` | Same task run twice with prior trace/memory allowed | Can it avoid repeated mistakes |
| `near-transfer` | Similar task with different surface details | Generalization |

Protocol:

```text
Round A: fresh run, no task memory.
Round B: same exact task, same model/harness, trace summary available.
Round C: analogous task, distilled learning available.
```

Metrics:

- `second_run_improvement`: delta in pass/cost/time/tool errors from Round A to Round B.
- `mistake_repetition_rate`: repeats same failed action from prior run.
- `learning_note_use`: applies prior lesson at the right moment.
- `overfit_rate`: applies prior lesson where it does not fit.
- `near_transfer_gain`: improves on analogous task without answer leakage.

Important:

Do not call this "learning" unless the prior run artifact is explicitly provided or the harness has a declared memory layer. Otherwise it is just random variance.

### 6. Skills vs No Skills

Measure skill loading as a first-class variable.

Cells:

```text
skills_off
skills_generic
skills_domain
skills_domain_plus_examples
skills_domain_plus_negative_cases
```

Skill-pack manifest:

```json
{
  "skill_condition": "skills_domain_plus_negative_cases",
  "skills": [
    {"name": "terminal-debugging", "version": "sha256:..."},
    {"name": "llm-evaluation", "version": "sha256:..."}
  ],
  "loaded_files": [
    "SKILL.md",
    "references/failure-modes.md",
    "examples/good-run.md"
  ]
}
```

Metrics:

- `skill_activation_accuracy`: uses the right skill when relevant.
- `skill_overhead`: extra tokens/time from skill loading.
- `skill_transfer_gain`: pass/cost improvement from skill use.
- `skill_misapplication_rate`: applies irrelevant skill.
- `skill_instruction_compliance`: follows required process gates.

Best experiment:

```text
same model + same harness + same task + same budget
compare skills_off vs skills_domain_plus_negative_cases
```

### 7. Input / Output Quality

Input quality means the harness preserves and prioritizes the user request.

Output quality means final deliverables are useful, honest, and actionable.

Input metrics:

- `constraint_retention`: keeps explicit constraints through long run.
- `ambiguity_handling`: asks or chooses safely when prompt is ambiguous.
- `priority_preservation`: does not chase irrelevant details.
- `context_distillation_quality`: compresses without losing blockers.

Output metrics:

- `answer_relevance`
- `artifact_completeness`
- `evidence_linkage`
- `actionability`
- `format_fit`
- `user_intent_match`
- `handoff_quality`

Use deterministic checks where possible:

- required sections present
- cited files exist
- commands actually ran
- output schema validates
- acceptance criteria mapped to evidence

Use human or LLM judge only for subjective prose quality after deterministic gates pass.

### 8. Thinking Quality

"Who is thinking better?" should be measured behaviorally.

Do not score private chain-of-thought. Score external reasoning artifacts and action quality.

Metrics:

- `decomposition_quality`: breaks task into correct subproblems.
- `causal_diagnosis`: finds root cause rather than symptom.
- `evidence_weighting`: trusts hard evidence over guesses.
- `decision_quality`: chooses high-leverage next action.
- `uncertainty_calibration`: labels unknowns and verifies.
- `counterfactual_checking`: considers alternate explanations when stuck.
- `scope_control`: avoids unnecessary expansion.

Reasoning probe tasks:

- ambiguous bug with tempting wrong fix
- misleading screenshot or error
- stale documentation vs live behavior
- two possible root causes, one cheaper to verify
- task requiring no-send/no-submit safety
- task where best answer is "blocked because X"

Scoring:

```text
good thinking = fewer wrong actions before decisive evidence
```

### 9. Honesty / Calibration

Harnesses often fail by sounding done before work is done.

Metrics:

- `verified_claim_rate`: final claims backed by tool output or artifacts.
- `unsupported_claim_rate`: claims without evidence.
- `blocked_honesty`: states blocker instead of pretending.
- `uncertainty_labeling`: marks inference vs verified fact.
- `failure_disclosure`: names tests not run and why.
- `overclaim_rate`: says "fixed", "green", "latest", or "complete" when not proven.

Honesty adversarial cases:

- command times out
- test partially runs
- browser screenshot unavailable
- source conflicts
- file absent
- tool result ambiguous
- user asks leading question with wrong premise

Hard rule:

```text
Final answer must not claim a pass unless verifier artifact exists.
```

### 10. Context Management

Context is a harness feature. Test it directly.

Context conditions:

| Condition | Description |
| --- | --- |
| `fresh_0k` | No prior context beyond task prompt |
| `warm_10k` | Useful prior docs and recent state |
| `loaded_50k` | Mixed useful and irrelevant context |
| `loaded_100k` | Very long history with distractors |
| `compressed_summary` | Prior run summarized by another agent |
| `stale_memory` | Includes old false or outdated context |
| `conflict_context` | Contains two conflicting instructions |

Metrics:

- `relevant_context_recall`
- `distractor_resistance`
- `instruction_precedence`
- `stale_context_detection`
- `summary_loss_rate`
- `context_cost_efficiency`
- `long_context_degradation`

Protocol:

```text
Run the same task at 0k, 50k, and 100k context.
Add known distractors and stale facts.
Measure whether the harness finds the current source of truth.
```

### 11. Execution Mode

The same harness may perform differently in CLI, SDK, terminal, IDE, browser, or remote runtime.

Modes:

| Mode | What to test |
| --- | --- |
| `sdk` | Programmatic control, structured events, automation reliability |
| `cli` | Real developer workflow, subprocess robustness, flags/config |
| `terminal` | Shell interaction, long-running commands, TTY behavior |
| `ide` | file navigation, diagnostics, editor-state awareness |
| `browser` | visual state, DOM actions, auth/session handling |
| `remote_host` | SSH, latency, path differences, env drift |

Recommendation:

```text
MVP should run via CLI and SDK.
CLI proves real user workflow.
SDK gives clean instrumentation.
Terminal/IDE/browser become mode adapters.
```

Runner contract:

```text
harness-meter adapter start
harness-meter adapter send_task
harness-meter adapter stream_events
harness-meter adapter stop
harness-meter adapter collect_artifacts
```

### 12. Hardness Levels

Use levels instead of one blended benchmark.

| Level | Name | Criteria | Example |
| --- | --- | --- | --- |
| L0 | smoke | one step, obvious verifier | create file, run check |
| L1 | routine | 2 to 5 steps, low ambiguity | fix lint/test failure |
| L2 | investigative | requires reading state and picking path | root-cause failing integration |
| L3 | long-horizon | many steps, partial failures, artifacts | implement feature with tests/docs |
| L4 | adversarial | misleading context, stale docs, traps | screenshot conflicts with filename |
| L5 | transfer | prior lesson must generalize | similar task after learning note |

Each benchmark suite should have a balanced ladder:

```text
10 x L0
20 x L1
20 x L2
10 x L3
10 x L4
10 x L5
```

Do not compare harnesses only on L0/L1. That rewards shallow automation.

## Scientific Design

### Variables

Independent variables:

- harness
- model
- execution mode
- context condition
- skill condition
- memory condition
- task hardness

Dependent variables:

- pass
- cost
- latency
- tool-use quality
- observation quality
- loop progression
- learning delta
- honesty
- output quality

Controls:

- same task
- same verifier
- same sandbox
- same budget
- same model settings
- same network policy
- same scoring code

### Minimum Experiment

```text
2 models
3 harnesses
3 hardness levels
2 skill conditions
3 repeats
```

Example:

```text
2 x 3 x 3 x 2 x 3 = 108 runs
```

This is enough to see harness effects without burning a full leaderboard budget.

### Strong Experiment

```text
3 models
5 harnesses
6 hardness levels
4 context conditions
5 skill conditions
3 repeats
```

This becomes:

```text
3 x 5 x 6 x 4 x 5 x 3 = 5400 condition-task runs
```

Only do this after the runner and cost accounting are solid.

### Statistical Reporting

Report:

- mean
- median
- confidence interval
- per-task paired deltas
- cost per solved task
- variance across repeats
- interaction effects

Most important comparison:

```text
paired same-task delta between harnesses
```

Better than:

```text
global average leaderboard score
```

### Interaction Effects To Watch

These are the valuable discoveries:

- Harness A only wins with huge context.
- Harness B wins when skills are off but loses when skills are on.
- Harness C has lower pass rate but much better cost per solved task.
- Harness D improves on retest, proving memory/learning works.
- Harness E collapses at 100k context because it stops following current files.
- Model upgrade gives less gain than harness recovery improvement.

## Test Suite Design

### Terminal Track

Use first.

Tests:

- shell task with exact verifier
- repo bugfix
- package/toolchain failure
- long-running command handling
- artifact generation
- hidden regression

Good benches:

- Terminal-Bench
- SWE-bench style local mini tasks
- custom minibench

### Browser / Image Track

Use after terminal baseline.

Tests:

- screenshot state recognition
- browser form completion
- visual diff
- UI bug from screenshot
- chart/table extraction
- auth-needed blocker honesty

Good benches:

- BrowserGym
- VisualWebArena via BrowserGym
- custom screenshot tasks

### Tool / API Track

Tests:

- stateful API calls
- invalid tool recovery
- policy-guided customer support
- multi-step user simulator
- dynamic milestone tracking

Good benches:

- ToolSandbox
- tau2-bench
- AppWorld

### Agent-Engineering Track

Custom tasks specifically for harness quality:

- same task with and without skills
- same task after prior failure note
- same task with 100k stale context
- same task via CLI vs SDK
- same task in terminal vs IDE
- same task with misleading image

This is the missing benchmark layer.

## Score Schema

```json
{
  "run_id": "run_001",
  "coordinate": {
    "model": "openai/gpt-5.3",
    "harness": "my-harness",
    "mode": "cli",
    "hardness": "L3",
    "context": "loaded_50k",
    "skills": "skills_domain"
  },
  "scores": {
    "outcome": 0.8,
    "observation": 0.7,
    "tool_use": 0.9,
    "loop_progression": 0.6,
    "learning": null,
    "input_quality": 0.8,
    "output_quality": 0.75,
    "thinking_quality": 0.7,
    "honesty": 1.0,
    "context_management": 0.65
  },
  "hard_metrics": {
    "oracle_pass": true,
    "tokens": 81233,
    "cost_usd": 1.42,
    "wall_seconds": 938,
    "tool_calls": 47,
    "tool_errors": 5,
    "recovered_tool_errors": 4,
    "unsupported_final_claims": 0
  }
}
```

## MVP Protocol

Build this first:

```text
Domains:
  terminal + image-lite

Harnesses:
  custom harness
  OpenHands or OpenCode
  toy baseline

Modes:
  CLI
  SDK

Context:
  fresh_0k
  loaded_50k

Skills:
  skills_off
  skills_domain

Hardness:
  L0, L1, L2

Learning:
  same-task retest on 5 tasks
```

Minimum task set:

```text
5 terminal smoke/routine tasks
5 investigative terminal tasks
5 image/screenshot observation tasks
5 honesty/adversarial tasks
5 same-task retest tasks
```

Minimum report:

- pass rate
- cost per solve
- tool recovery
- loop progression
- context degradation
- skills delta
- retest improvement
- honesty violations
- top 5 failure fingerprints

## Answer To The Open Questions

### Should it check images?

Yes. Not full OSWorld first. Start with image-lite tasks:

```text
given screenshot + files, identify state, take correct next action, verify artifact
```

### Tool use?

Yes. Tool use is one of the main harness differentiators. Measure selection, sequencing, arguments, recovery, and minimality.

### Loop progression?

Yes. Create phase labels from events and score stuck loops, verify loops, hypothesis updates, and closure integrity.

### Learning if same task runs twice?

Yes, but only if the prior trace or memory is explicitly part of the condition. Otherwise you cannot distinguish learning from variance.

### Skills and no skills?

Yes. Skill condition must be a top-level experimental variable.

### Input/output quality?

Yes. Keep deterministic gates first, then subjective ratings for prose and handoff quality.

### Who is thinking better?

Score external reasoning behavior:

```text
fewer wrong actions, better evidence use, better decomposition, better uncertainty calibration
```

Not private chain-of-thought.

### Honesty?

Yes. Treat honesty as a safety metric. Unsupported final claims should count against the harness even when the task passes.

### Scientific approach?

Use paired comparisons, controlled variables, repeated runs, confidence intervals, raw trace release, config hashes, and explicit condition coordinates.

### SDK or CLI?

Both.

CLI proves the real developer path.
SDK gives clean instrumentation.

The adapter should support both:

```text
sdk adapter for controlled experiments
cli adapter for real-world workflow proof
```

### Terminal or IDE?

Start terminal. Add IDE as a mode later.

Terminal gives deterministic setup and verifier control.
IDE measures navigation and diagnostics but is harder to standardize.

### Which tests and hardness?

Start L0-L2 only, then add L3-L5.

Do not start with only hard tasks. You need calibration tasks to know whether the harness is broken or the task is simply hard.

### Fresh context or 50/100k?

Both.

Context condition is a core harness metric:

```text
fresh_0k vs loaded_50k vs loaded_100k vs stale_memory
```

This reveals whether the harness manages context or drowns in it.

