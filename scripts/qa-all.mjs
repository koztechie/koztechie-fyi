#!/usr/bin/env node
// Єдина послідовність QA для Netlify, GitHub Actions і pre-commit.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const netlify = readFileSync("netlify.toml", "utf8");
if (!netlify.includes('ignore = "exit 0"')) {
  console.error("❌ qa-all: Netlify Git auto-deploy не вимкнений через ignore = \"exit 0\"");
  process.exit(1);
}

const commands = ["check", "plan-lint", "validate", "size", "voice-lint", "linkcheck"];
console.log("\n=== QA: check-runbook-commands ===");
execFileSync("node", ["scripts/check-runbook-commands.mjs"], { stdio: "inherit" });
console.log("\n=== QA: check-deploy-pin ===");
execFileSync("npm", ["run", "check:deploy-pin"], { stdio: "inherit" });

for (const command of commands) {
  console.log(`\n=== QA: npm run ${command} ===`);
  execFileSync("npm", ["run", command], { stdio: "inherit" });
}
console.log("\nРЕЗУЛЬТАТ: усі QA-гейти пройдено");
