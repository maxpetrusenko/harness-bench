# Prior lesson (different task, different output name)

A similar task transformed `data.json` into `summary.json` like this:

```js
const data = JSON.parse(fs.readFileSync('data.json'));
const summary = {
  count: data.length,
  sum: data.reduce((a, r) => a + r.value, 0),
  labels: [...new Set(data.map((r) => r.label))].sort(),
};
fs.writeFileSync('summary.json', JSON.stringify(summary, null, 2));
```

This task uses `totals.json` instead of `summary.json` but the same logic applies.
