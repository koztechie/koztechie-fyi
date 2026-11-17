#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const origin = "http://127.0.0.1:4173";
const referencesDir = "test-references";
const actualDir = "qa-artifacts/reflow";
const update = process.env.UPDATE_SCREENSHOTS === "1";
const pages = [
  ["home", "/"],
  ["nichlyst", "/nichlyst/"],
  ["poem", "/poetry/vnutrishnya-monholiya/"],
];
const viewports = [320, 768, 1440];
const failures = [];

mkdirSync(actualDir, { recursive: true });
if (update) mkdirSync(referencesDir, { recursive: true });

for (const [name, path] of pages) {
  for (const width of viewports) {
    const filename = `${name}-${width}.png`;
    const actual = join(actualDir, filename);
    const reference = join(referencesDir, filename);
    execFileSync("npx", [
      "--yes",
      "playwright@1.65.1",
      "screenshot",
      "--full-page",
      "--wait-for-timeout",
      "1000",
      "--viewport-size",
      `${width},900`,
      `${origin}${path}`,
      actual,
    ], { stdio: "inherit" });

    if (update) {
      execFileSync("cp", [actual, reference]);
      console.log(`Оновлено reference: ${reference}`);
    } else if (!existsSync(reference)) {
      failures.push(`${filename}: reference відсутній`);
    } else if (!readFileSync(actual).equals(readFileSync(reference))) {
      failures.push(`${filename}: screenshot відрізняється від reference`);
    } else {
      console.log(`✅ ${filename}: без diff`);
    }
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`❌ ${failure}`);
  process.exit(1);
}
console.log(`РЕЗУЛЬТАТ: reflow ${pages.length} сторінки × ${viewports.length} viewport пройдено`);
