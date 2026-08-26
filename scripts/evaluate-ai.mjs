import { readFile } from "node:fs/promises";
import { groundedFaqFallback, listingFallback, photoQualityFallback, ticketSummaryFallback } from "../src/lib/ai-fallbacks.ts";
import { searchIntentFallback } from "../src/lib/search-intent.ts";

const fixtures = JSON.parse(await readFile(new URL("../docs/ai-evaluation-data.json", import.meta.url), "utf8"));
const categories = ["Eggs", "Fruits", "Grains", "Poultry", "Tubers", "Vegetables"].map((name) => ({ id: name.toLowerCase(), name }));
const results = [];

function record(feature, input, passed, expected, actual) {
  results.push({ feature, input, passed, expected, actual });
}

for (const item of fixtures.search) {
  const actual = searchIntentFallback(item.input).terms;
  record("search", item.input, item.expectedAny.some((term) => actual.includes(term.toLowerCase())), item.expectedAny, actual);
}
for (const item of fixtures.faq) {
  const actual = groundedFaqFallback(item.input)?.title || null;
  record("faq", item.input, actual === item.expectedTitle, item.expectedTitle, actual);
}
for (const item of fixtures.listing) {
  const actual = listingFallback(item.input, categories);
  record("listing", item.input, actual.categoryName === item.expectedCategory && actual.unit === item.expectedUnit, { category: item.expectedCategory, unit: item.expectedUnit }, { category: actual.categoryName, unit: actual.unit });
}
for (const item of fixtures.photo) {
  const actual = photoQualityFallback(item.width, item.height, item.fileSize).quality;
  record("photo", `${item.width}x${item.height}, ${item.fileSize} bytes`, actual === item.expectedQuality, item.expectedQuality, actual);
}
for (const item of fixtures.support) {
  const actual = ticketSummaryFallback(item.subject, item.category, item.messages);
  const normalized = actual.toLowerCase();
  record("support", item.subject, item.expectedContains.every((term) => normalized.includes(term.toLowerCase())), item.expectedContains, actual);
}

const failures = results.filter((result) => !result.passed);
const grouped = Object.groupBy(results, (result) => result.feature);
for (const [feature, featureResults] of Object.entries(grouped)) {
  const passed = featureResults.filter((result) => result.passed).length;
  console.log(`${feature}: ${passed}/${featureResults.length} passed`);
}
if (failures.length) {
  console.error("\nFailed examples:");
  for (const failure of failures) console.error(`- [${failure.feature}] ${failure.input}\n  expected: ${JSON.stringify(failure.expected)}\n  actual: ${JSON.stringify(failure.actual)}`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${results.length} synthetic AI examples passed.`);
}
