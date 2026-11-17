#!/usr/bin/env node
// Єдина послідовність QA для Netlify, GitHub Actions і pre-commit.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const netlify = readFileSync("netlify.toml", "utf8");
if (!netlify.includes("npm run qa:all")) {
  console.error("❌ qa-all: netlify.toml не посилається на npm run qa:all");
  process.exit(1);
}

const commands = ["check", "validate", "size", "linkcheck:external", "voice-lint"];
for (const command of commands) {
  console.log(`\n=== QA: npm run ${command} ===`);
  execFileSync("npm", ["run", command], { stdio: "inherit" });
}
console.log("\nРЕЗУЛЬТАТ: усі QA-гейти пройдено");
