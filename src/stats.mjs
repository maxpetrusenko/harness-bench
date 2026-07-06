const round = (value, digits = 3) =>
  value === null || value === undefined || Number.isNaN(value) ? null : Number(value.toFixed(digits));

const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

const groupBy = (items, keyFn) => {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
};

export const pairedStats = (results) => {
  const byModel = groupBy(results, (r) => r.model);
  const rows = [];

  for (const [model, modelRuns] of byModel) {
    const harnesses = [...new Set(modelRuns.map((r) => r.harness))].sort();
    for (let i = 0; i < harnesses.length; i += 1) {
      for (let j = i + 1; j < harnesses.length; j += 1) {
        const a = harnesses[i];
        const b = harnesses[j];
        const aRuns = modelRuns.filter((r) => r.harness === a);
        const bRuns = modelRuns.filter((r) => r.harness === b);
        const keys = [
          ...new Set(
            [...aRuns, ...bRuns].map((r) => `${r.task}|||${r.repeat}|||${r.phase}|||${r.continuous_sequence ?? 1}`)
          ),
        ];
        const deltas = [];
        let aWins = 0;
        let bWins = 0;
        let ties = 0;

        for (const key of keys) {
          const pick = (runs) =>
            runs.find((r) => `${r.task}|||${r.repeat}|||${r.phase}|||${r.continuous_sequence ?? 1}` === key);
          const ar = pick(aRuns);
          const br = pick(bRuns);
          if (!ar || !br) continue;
          const delta = Number(br.pass) - Number(ar.pass);
          deltas.push(delta);
          if (delta > 0) bWins += 1;
          else if (delta < 0) aWins += 1;
          else ties += 1;
        }

        if (!deltas.length) continue;
        const deltaMean = mean(deltas);
        const variance =
          deltas.length > 1
            ? deltas.reduce((sum, value) => sum + (value - deltaMean) ** 2, 0) / (deltas.length - 1)
            : 0;
        const stderr = Math.sqrt(variance / deltas.length);
        rows.push({
          model,
          harness_a: a,
          harness_b: b,
          paired_cells: deltas.length,
          pass_delta_b_minus_a: round(deltaMean),
          ci95_low: round(deltaMean - 1.96 * stderr),
          ci95_high: round(deltaMean + 1.96 * stderr),
          a_wins: aWins,
          b_wins: bWins,
          ties,
        });
      }
    }
  }
  return rows;
};

