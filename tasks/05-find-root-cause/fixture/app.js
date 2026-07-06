import { loadConfig } from "./config-loader.js";
import { fetchRecords } from "./client.js";

const config = loadConfig();
const records = fetchRecords(config);

if (records === null) {
  console.log("ERROR: retry budget exhausted");
  process.exit(1);
}
console.log(`OK: fetched ${records.length} records`);
