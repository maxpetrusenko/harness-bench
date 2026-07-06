import { fetchWithRetry } from "./retry.js";

export const load = () => fetchWithRetry("http://example.test/data", 3);
