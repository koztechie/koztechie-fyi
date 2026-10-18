#!/usr/bin/env node
// palette-check.mjs: верифікація контрасту палітр ВУЗОЛ-0
// Джерело значень: docs/design-system.md §4 (таблиці з --змінна і hex).
// Перевіряє WCAG AAA (текст ≥7:1), UI-контраст (лінії/фокус ≥3:1), ліміт 6 кольорів.
// Використання: node scripts/palette-check.mjs

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const docPath = resolve("docs/design-system.md");

const lum = (hex) => {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// Текстові пари: AAA ≥7:1. UI-пари (лінії, фокус): ≥3:1.
const TEXT_PAIRS = [
  ["--ink", "--bg"],
  ["--ink", "--surface"],
  ["--ink-dim", "--bg"],
  ["--ink-dim", "--surface"],
  ["--accent", "--bg"],
  ["--accent", "--surface"],
];
const UI_PAIRS = [
  ["--rule", "--bg"],
  ["--rule", "--surface"],
  ["--accent", "--bg"],
  ["--accent", "--surface"],
];
const REQUIRED = ["--bg", "--surface", "--ink", "--ink-dim", "--accent", "--rule"];

console.log("=== PALETTE-CHECK (ВУЗОЛ-0) ===");
console.log("Джерело: docs/design-system.md §4");
console.log("Текст: WCAG AAA ≥ 7:1. Лінії та фокус: ≥ 3:1. Ліміт: 6 кольорів.");
console.log("");

if (!existsSync(docPath)) {
  console.error(`❌ ${docPath} не існує`);
  process.exit(1);
}

const doc = readFileSync(docPath, "utf-8");

// Знайти розділи палітр: ### 4.x. Палітра «НАЗВА» ... до наступного ###
function extractPalette(sectionTitle) {
  const start = doc.indexOf(sectionTitle);
  if (start === -1) return null;
  const rest = doc.slice(start + sectionTitle.length);
  const end = rest.indexOf("\n### ");
  const body = end === -1 ? rest : rest.slice(0, end);

  const palette = {};
  // Рядки таблиці: | `--змінна` | `#hex` | ...
  const rowRe = /^\|\s*`(--[a-z-]+)`\s*\|\s*`(#[0-9a-fA-F]{6})`\s*\|/gm;
  let m;
  while ((m = rowRe.exec(body)) !== null) palette[m[1]] = m[2];
  return palette;
}

const sections = [...doc.matchAll(/^### (4\.\d+\. Палітра «[^»]+»)/gm)].map((m) => m[1]);

if (sections.length === 0) {
  console.log("  ⚠️  Розділів палітр не знайдено. Пропущено (кроки 81–82).");
  process.exit(0);
}

let errors = 0;

for (const section of sections) {
  const name = section.replace(/^4\.\d+\. Палітра «/, "").replace(/»$/, "");
  console.log(`--- «${name}» (${section.split(".")[0]}) ---`);
  const p = extractPalette(section);

  // 1. Наявність обов'язкових змінних
  const missing = REQUIRED.filter((k) => !p[k]);
  if (missing.length > 0) {
    console.log(`  ❌ Немає змінних: ${missing.join(", ")}`);
    errors++;
    console.log("");
    continue;
  }
  console.log(`  ✅ 6 обов'язкових змінних`);

  // 2. Ліміт кольорів
  const count = Object.keys(p).length;
  if (count > 6) {
    console.log(`  ❌ ${count} значень (ліміт 6)`);
    errors++;
  } else {
    console.log(`  ✅ ${count} значень (ліміт 6)`);
  }

  // 3. Текстові пари AAA
  let textFail = 0;
  for (const [fg, bg] of TEXT_PAIRS) {
    const r = ratio(p[fg], p[bg]);
    if (r < 7) {
      console.log(`  ❌ ${fg} на ${bg}: ${r.toFixed(2)}:1 (AAA ≥ 7)`);
      errors++;
      textFail++;
    }
  }
  if (textFail === 0) console.log("  ✅ Текст: всі пари ≥ 7:1 (AAA)");

  // 4. UI-пари
  let uiFail = 0;
  for (const [fg, bg] of UI_PAIRS) {
    const r = ratio(p[fg], p[bg]);
    if (r < 3) {
      console.log(`  ❌ ${fg} на ${bg}: ${r.toFixed(2)}:1 (UI ≥ 3)`);
      errors++;
      uiFail++;
    }
  }
  if (uiFail === 0) console.log("  ✅ Лінії та фокус: всі пари ≥ 3:1");

  // 5. Розріз bg / surface
  const bs = ratio(p["--bg"], p["--surface"]);
  if (bs >= 1.3) {
    console.log(`  ⚠️  bg/surface ${bs.toFixed(2)}:1 — задрібно`);
  } else {
    console.log(`  ✅ bg/surface ${bs.toFixed(2)}:1`);
  }
  console.log("");
}

console.log("=== ПІДСУМКОВО ===");
if (errors > 0) {
  console.log(`Помилок: ${errors}`);
  console.log("РЕЗУЛЬТАТ: палітри не відповідають нормам");
  process.exit(1);
} else {
  console.log("Помилок: 0");
  console.log("РЕЗУЛЬТАТ: всі палітри відповідають нормам");
  process.exit(0);
}
