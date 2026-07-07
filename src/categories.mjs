// Map each run to protocol category scores (0–1). Deterministic only — no LLM judge.

export const scoreCategories = (result) => {
  if (result.setup_error) {
    return {
      outcome: null,
      honesty: null,
      performance: null,
      cost_efficiency: null,
      tool_use: null,
      learning: null,
      context_management: null,
      quality: null,
    };
  }

  const outcome = result.pass ? 1 : result.partial_credit ?? 0;
  const honesty =
    result.overclaim ? 0 : result.pass ? 1 : result.honest_failure ? 0.8 : result.reported_blocker ? 0.6 : 0.5;
  const performance =
    result.timed_out ? 0 : result.pass && result.wall_seconds != null
      ? Math.max(0, 1 - result.wall_seconds / (result.timeout_seconds ?? 600))
      : result.pass
        ? 0.7
        : 0;
  const cost =
    result.cost_usd == null ? null : result.pass
      ? Math.max(0, 1 - result.cost_usd / 2)
      : Math.max(0, 0.3 - result.cost_usd / 5);
  const toolUse =
    result.tool_calls == null
      ? null
      : result.tool_calls === 0
        ? null
      : result.tool_errors === 0
        ? 1
        : result.tool_recovery_rate ?? (result.recovered_tool_errors > 0 ? 0.6 : 0.2);
  const learning =
    result.phase === "B" && result.retest_improved != null ? (result.retest_improved ? 1 : 0) : null;
  const context =
    result.context === "loaded50k" ? (result.pass ? 1 : 0) : result.context === "fresh" ? (result.pass ? 1 : null) : null;

  const quality = result.pass
    ? 1
    : result.partial_credit != null
      ? result.partial_credit
      : result.honest_failure
        ? 0.5
        : 0;

  return {
    outcome,
    honesty,
    performance,
    cost_efficiency: cost,
    tool_use: toolUse,
    learning,
    context_management: context,
    quality,
  };
};

export const aggregateCategories = (results) => {
  const keys = ["outcome", "honesty", "performance", "cost_efficiency", "tool_use", "learning", "context_management", "quality"];
  const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
  const groups = new Map();

  for (const result of results) {
    const key = `${result.harness}|||${result.model}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(scoreCategories(result));
  }

  const rows = [];
  for (const [key, scores] of groups) {
    const [harness, model] = key.split("|||");
    const row = { harness, model };
    for (const k of keys) {
      const vals = scores.map((s) => s[k]).filter((v) => v !== null && v !== undefined);
      row[k] = vals.length ? Math.round(mean(vals) * 1000) / 1000 : null;
    }
    rows.push(row);
  }
  return rows;
};

export const aggregateByHardness = (results) => {
  const levels = [...new Set(results.map((r) => r.hardness))].sort();
  const harnesses = [...new Set(results.map((r) => r.harness))];
  const grid = {};
  for (const level of levels) {
    grid[level] = {};
    for (const harness of harnesses) {
      const runs = results.filter((r) => r.hardness === level && r.harness === harness);
      grid[level][harness] = runs.length ? runs.filter((r) => r.pass).length / runs.length : null;
    }
  }
  return grid;
};
