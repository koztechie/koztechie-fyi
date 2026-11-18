#!/usr/bin/env node

import { readFileSync } from "node:fs";

const nvmVersion = readFileSync(".nvmrc", "utf8").trim();
const netlify = readFileSync("netlify.toml", "utf8");
const netlifyVersion = netlify.match(/^\s*NODE_VERSION\s*=\s*"([^"]+)"/m)?.[1] || "";

if (!nvmVersion) {
  console.error("❌ G-09: .nvmrc порожній або відсутній");
  process.exit(1);
}

if (!netlifyVersion) {
  console.error("❌ G-09: NODE_VERSION відсутній у netlify.toml");
  process.exit(1);
}

if (nvmVersion !== netlifyVersion) {
  console.error(`❌ G-09: .nvmrc=${nvmVersion}, netlify.toml NODE_VERSION=${netlifyVersion}`);
  process.exit(1);
}

console.log(`✅ G-09: .nvmrc = netlify.toml NODE_VERSION = ${nvmVersion}`);
