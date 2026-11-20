#!/usr/bin/env node
// Перевіряє, що фактична версія Eleventy в колофоні відповідає залежності.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function checkFactsSync({ packageJson, colophons }) {
  const expected = packageJson?.dependencies?.["@11ty/eleventy"];
  const errors = [];

  if (typeof expected !== "string" || !expected.trim()) {
    errors.push("package.json: залежність @11ty/eleventy відсутня або порожня");
  }

  for (const [file, content] of Object.entries(colophons)) {
    const versions = [...content.matchAll(/^\s*-\s+\*\*Eleventy\s+([^*]+)\*\*/gm)]
      .map(([, version]) => version.trim());
    if (versions.length !== 1) {
      errors.push(`${file}: очікується один рядок Eleventy, знайдено ${versions.length}`);
    } else if (versions[0] !== expected) {
      errors.push(`${file}: Eleventy ${versions[0]} не збігається з package.json (${expected})`);
    }
  }

  return { ok: errors.length === 0, expected, errors };
}

function main() {
  let packageJson;
  try {
    packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
  } catch (error) {
    console.error(`❌ facts-sync: не вдалося прочитати package.json: ${error.message}`);
    process.exit(1);
  }

  const paths = {
    "content/uk/pages/colophon.md": resolve("content/uk/pages/colophon.md"),
    "content/en/pages/colophon.md": resolve("content/en/pages/colophon.md"),
  };
  const colophons = {};
  for (const [name, path] of Object.entries(paths)) {
    try {
      colophons[name] = readFileSync(path, "utf8");
    } catch (error) {
      console.error(`❌ facts-sync: ${name}: ${error.message}`);
      process.exit(1);
    }
  }

  const result = checkFactsSync({ packageJson, colophons });
  if (!result.ok) {
    for (const error of result.errors) console.error(`❌ facts-sync: ${error}`);
    process.exit(1);
  }
  console.log(`✅ facts-sync: обидва колофони відповідають Eleventy ${result.expected}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
