#!/usr/bin/env node
// Єдина послідовність QA для Netlify, GitHub Actions і pre-commit.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const netlify = readFileSync("netlify.toml", "utf8");
const expectedNetlifyCommand = 'command = "command -v magick || command -v convert || (echo \'ImageMagick required\' && exit 1); npm ci --ignore-scripts && npm run build && npm run check && npm run validate && npm run size && npm run voice-lint && npm run linkcheck"';
if (!netlify.includes(expectedNetlifyCommand)) {
  console.error("❌ qa-all: netlify.toml має містити offline production command");
  process.exit(1);
}

const commands = ["check", "validate", "size", "voice-lint", "linkcheck"];
for (const command of commands) {
  console.log(`\n=== QA: npm run ${command} ===`);
  execFileSync("npm", ["run", command], { stdio: "inherit" });
}
console.log("\nРЕЗУЛЬТАТ: усі QA-гейти пройдено");
