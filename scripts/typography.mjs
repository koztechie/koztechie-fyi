#!/usr/bin/env node
// Нормалізує апострофи у зібраному HTML і перевіряє результат без залежностей.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const pathArg = args.find((arg) => !arg.startsWith("--"));
const distDir = resolve(pathArg || "dist");
const fix = args.includes("--fix");

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (entry.isFile() && path.endsWith(".html")) files.push(path);
  }
  return files;
}

function normalizeApostrophes(value) {
  return value
    .replace(/&#(?:0*39|x0*27);/gi, "’")
    .replace(/['\u02bc]/g, "’");
}

function normalizeTag(tag) {
  if (tag.startsWith("<!--")) {
    return `<!--${normalizeApostrophes(tag.slice(4, -3))}-->`;
  }

  const normalizedEntities = tag.replace(/&#(?:0*39|x0*27);/gi, "’");
  let output = "";
  let quote = "";

  for (const char of normalizedEntities) {
    if (quote) {
      const closingQuote = char === quote;
      if (closingQuote) quote = "";
      output += closingQuote || char !== "'" ? char : "’";
      continue;
    }

    if (char === '"') {
      quote = '"';
      output += char;
      continue;
    }

    if (char === "'") {
      if (output.trimEnd().at(-1) === "=") {
        quote = "'";
        output += char;
      } else {
        output += "’";
      }
      continue;
    }

    output += char;
  }

  return output;
}

function normalizeHtml(html) {
  return html.replace(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g, (token) =>
    token.startsWith("<") ? normalizeTag(token) : normalizeApostrophes(token)
  );
}

console.log(`=== TYPOGRAPHY ${fix ? "FIX" : "CHECK"} ===`);

let errors = 0;
let changed = 0;
for (const file of walk(distDir)) {
  const original = readFileSync(file, "utf8");
  const normalized = normalizeHtml(original);
  if (normalized === original) continue;

  if (fix) {
    writeFileSync(file, normalized);
    changed++;
  } else {
    console.error(`❌ ${file.slice(distDir.length + 1)} — знайдено апостроф не U+2019`);
    errors++;
  }
}

if (fix) {
  console.log(`✅ Нормалізовано HTML-файлів: ${changed}`);
} else if (errors) {
  console.error(`❌ Помилок типографіки: ${errors}. Запусти npm run build.`);
  process.exit(1);
} else {
  console.log("✅ Усі апострофи в HTML — U+2019.");
}
