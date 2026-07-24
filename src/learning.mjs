const round = (value, digits = 3) =>
  value === null || value === undefined || Number.isNaN(value) ? null : Number(value.toFixed(digits));

const cellKey = (run, kind) => {
  const parts = [
    run.task,
    run.repeat ?? 1,
    run.continuous_sequence ?? 1,
    run.context ?? "fresh",
    run.skills ?? "off",
  ];
  if (kind === "harness") parts.push(run.model);
  if (kind === "model") parts.push(run.harness);
  return parts.join("|||");
};

const groupKey = (run, kind) => {
  if (kind === "harness") return run.harness;
  if (kind === "model") return run.model;
  return `${run.harness}|||${run.model}`;
};

const makeRow = (kind, key, runs) => {
  const aByKey = new Map();
  const bByKey = new Map();
  for (const run of runs) {
    if (run.setup_error) continue;
    if (run.phase === "A") aByKey.set(cellKey(run, kind), run);
    if (run.phase === "B") bByKey.set(cellKey(run, kind), run);
  }

  let matched = 0;
  let passA = 0;
  let passB = 0;
  let failToPass = 0;
  let wallImproved = 0;
  let anyImproved = 0;
  for (const [pairKey, a] of aByKey) {
    const b = bByKey.get(pairKey);
    if (!b) continue;
    matched += 1;
    if (a.pass) passA += 1;
    if (b.pass) passB += 1;
    const learnedSuccess = !a.pass && b.pass;
    const fasterSameOutcome =
      a.pass &&
      b.pass &&
      typeof a.wall_seconds === "number" &&
      typeof b.wall_seconds === "number" &&
      b.wall_seconds < a.wall_seconds * 0.9;
    if (learnedSuccess) failToPass += 1;
    if (fasterSameOutcome) wallImproved += 1;
    if (learnedSuccess || fasterSameOutcome || b.retest_improved) anyImproved += 1;
  }
  if (matched === 0) return null;

  const [harness, model] = kind === "harness_model" ? key.split("|||") : ["", ""];
  return {
    kind,
    harness: kind === "harness" ? key : harness,
    model: kind === "model" ? key : model,
    matched_pairs: matched,
    pass_rate_a: round(passA / matched),
    pass_rate_b: round(passB / matched),
    pass_gain: round((passB - passA) / matched),
    fail_to_pass_rate: round(failToPass / matched),
    wall_improvement_rate: round(wallImproved / matched),
    any_improvement_rate: round(anyImproved / matched),
  };
};

export const learningStats = (results) => {
  if (!results.some((run) => run.phase === "A" || run.phase === "B")) return [];

  const rows = [];
  for (const kind of ["harness_model", "harness", "model"]) {
    const groups = new Map();
    for (const run of results) {
      if (run.phase !== "A" && run.phase !== "B") continue;
      const key = groupKey(run, kind);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(run);
    }
    for (const [key, runs] of groups) {
      const row = makeRow(kind, key, runs);
      if (row) rows.push(row);
    }
  }

  return rows.sort(
    (a, b) =>
      b.fail_to_pass_rate - a.fail_to_pass_rate ||
      b.any_improvement_rate - a.any_improvement_rate ||
      a.kind.localeCompare(b.kind) ||
      a.harness.localeCompare(b.harness) ||
      a.model.localeCompare(b.model)
  );
};
