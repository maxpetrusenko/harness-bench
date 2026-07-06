// Simulated flaky client: the first two attempts fail, the third succeeds.
let attempts = 0;

const tryFetch = () => {
  attempts += 1;
  if (attempts < 3) return null;
  return [{ id: 1 }, { id: 2 }, { id: 3 }];
};

export const fetchRecords = (config) => {
  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    const result = tryFetch();
    if (result !== null) return result;
  }
  return null;
};
