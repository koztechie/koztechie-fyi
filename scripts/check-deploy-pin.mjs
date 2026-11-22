#!/usr/bin/env node

import { readFileSync } from "node:fs";

const expectedVersion = "27.20.0";
const toolsPackage = JSON.parse(readFileSync("scripts/tools/package.json", "utf8"));
const toolsLock = JSON.parse(readFileSync("scripts/tools/package-lock.json", "utf8"));
const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");

const errors = [];
if (toolsPackage.dependencies?.["netlify-cli"] !== expectedVersion) {
  errors.push(
    `scripts/tools/package.json має фіксувати netlify-cli=${expectedVersion} без діапазону версій`,
  );
}
if (toolsLock.packages?.[""]?.dependencies?.["netlify-cli"] !== expectedVersion) {
  errors.push(`tools lockfile не фіксує netlify-cli=${expectedVersion}`);
}
if (toolsLock.packages?.["node_modules/netlify-cli"]?.version !== expectedVersion) {
  errors.push(`tools lockfile не містить node_modules/netlify-cli@${expectedVersion}`);
}
if (!/npx\s+--prefix\s+scripts\/tools\s+netlify\s+deploy\b/.test(workflow)) {
  errors.push("deploy.yml має викликати Netlify CLI через npx --prefix scripts/tools");
}
if (!/if:\s*\$\{\{\s*github\.ref\s*==\s*'refs\/heads\/main'\s*&&/.test(workflow)) {
  errors.push("production deploy має бути заблокований для workflow_dispatch з ref, відмінним від main");
}
if (/npx\s+--yes\s+netlify-cli\b/.test(workflow)) {
  errors.push("deploy.yml не повинен використовувати глобальний npx --yes netlify-cli");
}

if (errors.length > 0) {
  for (const error of errors) console.error(`❌ G-16: ${error}`);
  process.exit(1);
}

console.log(
  `✅ G-16: netlify-cli@${expectedVersion} у tools lockfile; deploy.yml використовує --prefix`,
);
