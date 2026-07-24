# Hermes PR Agent Coverage

Read when: adding `harness-bench` to Max's daily OSS PR review/improvement loop.

## Repo entry

```json
{
  "key": "harness-bench",
  "repo": "maxpetrusenko/harness-bench",
  "cwd": "$HOME/Desktop/Projects/harness-bench",
  "description": "Harness-first benchmark for measuring agent runtimes, learning rate, honesty, tool use, context handling, and image observation."
}
```

## Hermes env override

`$HOME/Desktop/Projects/manager/scripts/hermes-oss-pr-daily.mjs` supports `HERMES_OSS_PR_REPOS` as a JSON repo list. Add the entry above to the existing core repo list, then include the repo in the schedule.

Repo-only smoke config:

```bash
export HERMES_OSS_PR_REPOS="[{\"key\":\"harness-bench\",\"repo\":\"maxpetrusenko/harness-bench\",\"cwd\":\"$HOME/Desktop/Projects/harness-bench\",\"description\":\"Harness-first benchmark for measuring agent runtimes, learning rate, honesty, tool use, context handling, and image observation.\"}]"
export HERMES_OSS_PR_SCHEDULE_REPOS="harness-bench"
export HERMES_OSS_PR_SKILLS="github-issues,test-driven-development,agent-learning-loop,gstack-autoplan,gstack-review,github-code-review"
```

Daily core config should keep the existing repo objects and append the `harness-bench` object; do not replace GStack, GBrain, Hermes Agent, or `last30days-skill`.

Keep public comments disabled unless the run is explicitly approved.

## Daily loop

```bash
cd "$HOME/Desktop/Projects/harness-bench"
npm run daily:radar
```

Hermes should use the radar output to choose one narrow PR:

1. Researcher checks new harness/runtime options and current CLI docs.
2. Planner turns the best gap into one vertical slice.
3. Coder opens or updates a PR.
4. Reviewer runs autoreview skills and local gates.
5. Approval happens only after `npm test`, `npm run sdk:smoke`, and `npm run smoke` pass.

Do not auto-install global harness CLIs or run paid scored matrices in the daily radar. Installing or removing real harnesses is an explicit benchmark-prep action.
