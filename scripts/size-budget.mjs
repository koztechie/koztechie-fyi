#!/usr/bin/env node
// size-budget.mjs: бюджети ваги ВУЗОЛ-0
// Рахує окремий Brotli q11 розмір файлів у dist/. Падає (exit 1) при перевищенні.
// Бюджети: TECH_STANDARDS.md §1, AGENTS.md §3. Використання:
// node scripts/size-budget.mjs [dist/]

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { brotliCompressSync, constants as zlibConstants } from "node:zlib";

const distDir = resolve(process.argv[2] || "dist");

if (!existsSync(distDir)) {
  console.error(`❌ ${distDir} не існує. Спочатку: npm run build`);
  process.exit(1);
}

const KB = 1024;
let errors = 0;
let warnings = 0;

function brotliKB(file) {
  const content = readFileSync(file);
  const compressed = brotliCompressSync(content, {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
  });
  return compressed.length / KB;
}

function walk(dir) {
  const results = [];
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    if (statSync(full).isDirectory()) results.push(...walk(full));
    else results.push(full);
  }
  return results;
}

function fail(msg) {
  console.log(`  ❌ ${msg}`);
  errors++;
}

function ok(msg) {
  console.log(`  ✅ ${msg}`);
}

function warn(msg) {
  console.log(`  ⚠️  ${msg}`);
  warnings++;
}

const files = walk(distDir);
console.log("=== SIZE-BUDGET (ВУЗОЛ-0) ===");
console.log(`dist: ${distDir}`);
console.log(`Файлів: ${files.length}`);
console.log("");

// 1. Brotli q11 розмір HTML сторінки + CSS/JS усього сайту ≤ 50 КіБ
console.log("--- 1. Сторінка (HTML + усі CSS/JS, Brotli q11) ≤ 50 КіБ ---");
const htmlFiles = files.filter((f) => f.endsWith(".html"));
const cssFiles = files.filter((f) => f.endsWith(".css"));
const jsFiles = files.filter((f) => f.endsWith(".js"));

// CSS спільний для всіх сторінок: сумарна вага brotli
let cssTotal = 0;
for (const f of cssFiles) cssTotal += brotliKB(f);

let jsTotal = 0;
for (const f of jsFiles) jsTotal += brotliKB(f);

if (htmlFiles.length === 0) {
  console.log("  ⚠️  HTML-файлів немає. Пропущено.");
} else {
  let pageErrors = 0;
  for (const f of htmlFiles) {
    const pageKB = brotliKB(f) + cssTotal + jsTotal;
    if (pageKB > 50) {
      fail(`${f.replace(distDir + "/", "")}: ${pageKB.toFixed(1)} КіБ (бюджет 50 КіБ)`);
      pageErrors++;
    }
  }
  if (pageErrors === 0) ok(`${htmlFiles.length} HTML-сторінок ≤ 50 КіБ (HTML окремо + CSS ${cssTotal.toFixed(1)} + JS ${jsTotal.toFixed(1)})`);
}

// JS: 0 байт — окрема перевірка тут не потрібна (check.mjs 7а), але вагу рахуємо
if (jsFiles.length > 0) {
  fail(`JS: ${jsFiles.length} файлів, ${jsTotal.toFixed(1)} КБ (бюджет 0)`);
}
console.log("");

// 2. CSS сумарний ≤ 15 КБ
console.log("--- 2. CSS сумарний ≤ 15 КБ ---");
if (cssTotal > 15) {
  fail(`${cssTotal.toFixed(1)} КБ (бюджет 15 КБ)`);
} else if (cssFiles.length === 0) {
  console.log("  ⚠️  CSS-файлів немає. Пропущено.");
} else {
  ok(`${cssFiles.length} файлів, ${cssTotal.toFixed(1)} КБ`);
}
console.log("");

// 3. Системні шрифти: завантажуваних шрифтів у збірці немає.
console.log("--- 3. Системні шрифти ---");
const fontFiles = files.filter((f) => f.endsWith(".woff2") || f.endsWith(".woff"));
if (fontFiles.length > 0) fail(`знайдено ${fontFiles.length} завантажуваних шрифтів`);
else ok("завантажуваних шрифтів немає");
console.log("");

// 4. Одне зображення ≤ 80 КБ
console.log("--- 4. Зображення ≤ 80 КБ (кожне) ---");
const imgFiles = files.filter((f) =>
  [".webp", ".avif", ".png", ".jpg", ".jpeg", ".gif", ".svg"].includes(extname(f)) &&
  !/favicon/i.test(f)
);
let imgErrors = 0;
for (const f of imgFiles) {
  const kb = brotliKB(f);
  if (kb > 80) {
    fail(`${f.replace(distDir + "/", "")}: ${kb.toFixed(1)} КБ (бюджет 80 КБ)`);
    imgErrors++;
  }
}
if (imgErrors === 0) ok(`${imgFiles.length} зображень, кожне ≤ 80 КБ`);
console.log("");

// 5. Favicon (SVG + растрові) ≤ 10 КБ
console.log("--- 5. Favicon ≤ 10 КБ ---");
const favFiles = files.filter((f) => /favicon|apple-touch-icon|site\.webmanifest/i.test(f));
let favTotal = 0;
for (const f of favFiles) favTotal += brotliKB(f);
if (favTotal > 10) {
  fail(`${favFiles.length} файлів, ${favTotal.toFixed(1)} КБ (бюджет 10 КБ)`);
} else if (favFiles.length === 0) {
  console.log("  ⚠️  Favicon немає. Пропущено.");
} else {
  ok(`${favFiles.length} файлів, ${favTotal.toFixed(1)} КБ`);
}
console.log("");

// 6. CSS + favicon ≤ 25 КБ.
console.log("--- 6. CSS + favicon ≤ 25 КБ ---");
const coreTotal = cssTotal + favTotal;
if (coreTotal > 25) {
  fail(`${coreTotal.toFixed(1)} КБ (бюджет 25 КБ)`);
} else {
  ok(`${coreTotal.toFixed(1)} КБ`);
}
console.log("");

// 7. /feed.xml ≤ 500 КБ (попередження, не помилка — TECH_STANDARDS §1)
console.log("--- 7. /feed.xml ≤ 500 КБ (попередження) ---");
const feed = files.find((f) => f.endsWith("feed.xml"));
if (feed) {
  const feedKB = brotliKB(feed);
  if (feedKB > 500) {
    warn(`feed.xml: ${feedKB.toFixed(1)} КБ (ліміт 500 КБ). Архів росте — це очікувано.`);
  } else {
    ok(`feed.xml: ${feedKB.toFixed(1)} КБ`);
  }
} else {
  console.log("  ⚠️  feed.xml немає. Пропущено.");
}
console.log("");

// 8. Сайт (dist/ без зображень та feed.xml) ≤ 2 МБ
// Зображення без обмеження (архів), feed.xml росте необмежено — обидва винятки §1.
console.log("--- 8. Сайт (без зображень і feed.xml) ≤ 2 МБ ---");
const siteFiles = files.filter(
  (f) => !imgFiles.includes(f) && !f.endsWith("feed.xml")
);
let siteTotal = 0;
for (const f of siteFiles) siteTotal += brotliKB(f);
if (siteTotal > 2048) {
  fail(`${siteFiles.length} файлів, ${(siteTotal / 1024).toFixed(1)} МБ (бюджет 2 МБ)`);
} else {
  ok(`${siteFiles.length} файлів, ${(siteTotal / 1024).toFixed(2)} МБ`);
}
console.log("");

// Підсумок
console.log("=== ПІДСУМКОВО ===");
console.log(`Помилок бюджету: ${errors}`);
console.log(`Попереджень: ${warnings}`);
if (errors > 0) {
  console.log("РЕЗУЛЬТАТ: бюджети перевищено");
  process.exit(1);
} else {
  console.log("РЕЗУЛЬТАТ: всі бюджети дотримано");
  process.exit(0);
}
