#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

const origin = "http://127.0.0.1:4173";
const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const referencesDir = join(repoRoot, "test-references");
const actualDir = join(repoRoot, "qa-artifacts/reflow");
const toolsDir = join(repoRoot, "scripts/tools");
const playwrightBin = join(toolsDir, "node_modules/.bin/playwright");
const update = process.env.UPDATE_SCREENSHOTS === "1";
const advisory = process.env.REFLOW_ADVISORY === "1";
const fuzz = "2%";
const pixelThreshold = 0.001;
const pages = [
  { name: "home", path: "/", baseline: true },
  { name: "home-en", path: "/en/" },
  { name: "nichlyst", path: "/nichlyst/", baseline: true },
  { name: "poem", path: "/poetry/vnutrishnya-monholiya/", baseline: true },
  { name: "essay-en", path: "/en/blog/blog-manifesto/" },
  { name: "blog-index", path: "/blog/" },
  { name: "practice-index", path: "/practice/" },
  { name: "cemetery-index", path: "/cemetery/" },
  { name: "cemetery-index-en", path: "/en/cemetery/" },
  { name: "poetry-index", path: "/poetry/" },
  { name: "essay", path: "/blog/blog-manifesto/" },
  { name: "cemetery-entry", path: "/cemetery/svitlogics/" },
  { name: "cemetery-entry-en", path: "/en/cemetery/svitlogics/" },
  { name: "now", path: "/now/" },
  { name: "now-en", path: "/en/now/" },
  { name: "contact", path: "/contact/" },
  { name: "contact-en", path: "/en/contact/" },
  { name: "translation-stub", path: "/en/poetry/vnutrishnya-monholiya/" },
  { name: "not-found", path: "/404.html" },
];
const viewports = [320, 768, 1440];
const failures = [];
const differences = [];

function makeImagesEager(directory, originals) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      makeImagesEager(path, originals);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      const source = readFileSync(path, "utf8");
      const eager = source
        .replaceAll('loading="lazy"', 'loading="eager"')
        .replaceAll('decoding="async"', 'decoding="sync"');
      if (eager !== source) {
        originals.push([path, source]);
        writeFileSync(path, eager);
      }
    }
  }
}

function imagePixels(path) {
  return Number(
    execFileSync("identify", ["-format", "%w %h", path], { encoding: "utf8" })
      .trim()
      .split(/\s+/)
      .reduce((product, value) => product * Number(value), 1)
  );
}

function compareImages(actual, reference, diff) {
  const result = spawnSync(
    "compare",
    ["-fuzz", fuzz, "-metric", "AE", actual, reference, diff],
    { encoding: "utf8" }
  );
  if (result.error || (result.status !== 0 && result.status !== 1)) {
    throw result.error ?? new Error(`compare завершився зі статусом ${result.status}`);
  }
  const metric = Number.parseInt(
    `${result.stderr}${result.stdout}`.match(/\d+/)?.[0] ?? "0",
    10
  );
  return { metric, threshold: imagePixels(actual) * pixelThreshold };
}

// Full-page capture scrolls the document; restore the build byte-for-byte afterward.
const eagerOriginals = [];
try {
  makeImagesEager(join(repoRoot, "dist"), eagerOriginals);
  mkdirSync(actualDir, { recursive: true });
  if (update) mkdirSync(referencesDir, { recursive: true });

  for (const { name, path, baseline = false } of pages) {
    for (const width of viewports) {
      const filename = `${name}-${width}.png`;
      const actual = join(actualDir, filename);
      const reference = join(referencesDir, filename);
      execFileSync(playwrightBin, [
        "screenshot",
        "--full-page",
        "--wait-for-timeout",
        "1000",
        "--viewport-size",
        `${width},900`,
        `${origin}${path}`,
        actual,
      ], { cwd: toolsDir, stdio: "inherit" });

      if (!baseline && !update) {
        console.log(`ℹ️ ${filename}: знімок архетипу збережено для дизайн-рев’ю`);
      } else if (update) {
        execFileSync("cp", [actual, reference]);
        console.log(`Оновлено reference: ${reference}`);
      } else if (!existsSync(reference)) {
        failures.push(`${filename}: reference відсутній`);
      } else {
        const diff = join(actualDir, `${name}-${width}-diff.png`);
        const { metric, threshold } = compareImages(actual, reference, diff);
        if (metric === 0) {
          unlinkSync(diff, { force: true });
          console.log(`✅ ${filename}: без diff`);
        } else if (metric > threshold) {
          differences.push(
            `${filename}: ${metric} відмінних пікселів > ${Math.floor(threshold)} (${pixelThreshold * 100}%); diff: ${diff}`
          );
          console.error(
            `❌ ${filename}: ${metric} пікселів > поріг ${Math.floor(threshold)}; diff: ${diff}`
          );
        } else {
          console.log(
            `⚠️ ${filename}: ${metric} пікселів у межах допуску ${Math.floor(threshold)}; diff: ${diff}`
          );
        }
      }
    }
  }
} finally {
  for (const [path, source] of eagerOriginals) writeFileSync(path, source);
}

if (failures.length) {
  for (const failure of failures) console.error(`❌ ${failure}`);
  process.exit(1);
}
if (differences.length) {
  const marker = advisory ? "⚠️" : "❌";
  for (const difference of differences) console.error(`${marker} ${difference}`);
  if (!advisory) process.exit(1);
  console.warn("⚠️ Різниці reflow інформаційні; CI продовжується.");
}
const result = differences.length
  ? "завершено з інформаційними відмінностями"
  : "пройдено";
console.log(`РЕЗУЛЬТАТ: reflow ${pages.length} сторінки × ${viewports.length} viewport ${result}`);
