#!/usr/bin/env node

import { readFileSync } from "node:fs";

const files = ["docs/runbook.md", "docs/recovery.md"];

// Netlify CLI 27.20.0 commands. deploy:list is intentionally absent: this CLI
// has no deploy:list/deploy:restore; use `api listSiteDeploys` /
// `api restoreSiteDeploy` instead. `api` accepts Netlify Open API methods.
const allowedCommands = new Set([
  "agents",
  "api",
  "blobs",
  "build",
  "claim",
  "clone",
  "completion",
  "create",
  "database",
  "deploy",
  "dev",
  "env",
  "init",
  "link",
  "logs",
  "open",
  "recipes",
  "serve",
  "status",
  "status:hooks",
  "switch",
  "teams",
  "unlink",
  "watch",
  "sites",
  "sites:create",
  "sites:delete",
  "sites:list",
  "sites:search",
]);

function bashBlocks(markdown) {
  return [...markdown.matchAll(/^```bash[^\n]*\n([\s\S]*?)^```[ \t]*$/gm)].map(
    (match) => match[1],
  );
}

function stripShellComment(line) {
  let quote = null;
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "#" && (index === 0 || /\s/.test(line[index - 1]))) {
      return line.slice(0, index);
    }
  }

  return line;
}

function findNetlifyCommands(block) {
  const source = block.replace(/\\\r?\n/g, " ");
  const commands = [];
  const invocation =
    /(?:^|[;&|]\s*|\b(?:then|do)\s+)(?:npx\s+)?netlify(?:-cli)?\s+([a-z][a-z0-9:-]*)/gim;

  for (const line of source.split(/\r?\n/)) {
    const uncommented = stripShellComment(line);
    invocation.lastIndex = 0;
    for (const match of uncommented.matchAll(invocation)) {
      commands.push(match[1].toLowerCase());
    }
  }

  return commands;
}

let errors = 0;
let found = 0;

for (const file of files) {
  const markdown = readFileSync(file, "utf8");
  for (const [blockIndex, block] of bashBlocks(markdown).entries()) {
    for (const command of findNetlifyCommands(block)) {
      found += 1;
      if (allowedCommands.has(command)) continue;

      errors += 1;
      console.error(
        `❌ ${file}: невідома команда Netlify \`${command}\` у bash-блоці ${blockIndex + 1}`,
      );
    }
  }
}

if (errors > 0) {
  console.error(
    `\nCHECK-RUNBOOK-COMMANDS: ${errors} невідомих команд Netlify із ${found}`,
  );
  process.exit(1);
}

console.log(
  `✅ CHECK-RUNBOOK-COMMANDS: ${found} команд Netlify у ${files.join(", ")} дозволені`,
);
