#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const path = process.env.DEPENDABOT_CONFIG || ".github/dependabot.yml";
const source = await readFile(path, "utf8");
const errors = [];

if (/\t/.test(source)) errors.push("tabs are not allowed");
if (!/^version:\s*2\s*$/m.test(source)) errors.push("version must be 2");

const blocks = source
  .split(/\n(?=  - package-ecosystem:)/)
  .filter((block) => /^  - package-ecosystem:/.test(block));

const expected = [
  { ecosystem: "npm", directory: "/scripts/tools", time: "06:17", label: "qa-tools" },
  { ecosystem: "npm", directory: "/", time: "06:27", label: "eleventy" },
  { ecosystem: "github-actions", directory: "/", time: "06:37", label: "github-actions" },
];

if (blocks.length !== expected.length) {
  errors.push(`expected ${expected.length} update blocks, found ${blocks.length}`);
}

for (const requirement of expected) {
  const block = blocks.find((candidate) =>
    candidate.includes(`package-ecosystem: ${requirement.ecosystem}`)
    && candidate.includes(`directory: ${requirement.directory}`)
    && candidate.includes(`time: "${requirement.time}"`),
  );

  if (!block) {
    errors.push(
      `missing ${requirement.ecosystem} update for ${requirement.directory} at ${requirement.time}`,
    );
    continue;
  }

  if (!/interval:\s*monthly\b/.test(block)) errors.push(`${requirement.ecosystem} ${requirement.directory}: interval must be monthly`);
  if (/^\s+day\s*:/m.test(block)) errors.push(`${requirement.ecosystem} ${requirement.directory}: day is invalid with monthly`);
  if (!/timezone:\s*Europe\/Kyiv\b/.test(block)) errors.push(`${requirement.ecosystem} ${requirement.directory}: timezone must be Europe/Kyiv`);
  if (!/open-pull-requests-limit:\s*1\b/.test(block)) errors.push(`${requirement.ecosystem} ${requirement.directory}: PR limit must be 1`);
  if (!new RegExp(`^\\s+- ${requirement.label}\\s*$`, "m").test(block)) {
    errors.push(`${requirement.ecosystem} ${requirement.directory}: missing label ${requirement.label}`);
  }

  if (requirement.directory === "/" && requirement.ecosystem === "npm"
    && !/versioning-strategy:\s*increase\b/.test(block)) {
    errors.push("root npm update must use versioning-strategy: increase");
  }
}

if (errors.length) {
  console.error("❌ Dependabot configuration invalid:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`✅ Dependabot configuration valid: ${blocks.length} update blocks`);
