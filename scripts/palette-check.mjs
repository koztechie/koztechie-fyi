#!/usr/bin/env node
// Контрастна перевірка токенів теми та їхніх рольових застосувань.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { selectActiveCssFiles } from "./active-css.mjs";
import { readThemeColors, paletteRatioRows, renderPaletteRatioTable } from "./theme-colors.mjs";

const themePath = resolve("src/styles/themes.css");
const distDir = resolve("dist");
if (!existsSync(themePath)) {
  console.error("❌ src/styles/themes.css не існує");
  process.exit(1);
}

const themeCss = readFileSync(themePath, "utf8");
const baseColors = readThemeColors();
const aliases = { "--surface": "--paper", "--link": "--accent", "--focus": "--accent" };
let errors = 0;

function fail(message) {
  console.error(`❌ ${message}`);
  errors++;
}

function luminance(hex) {
  const values = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = values.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

console.log("=== PALETTE-CHECK ===");
for (const [alias, target] of Object.entries(aliases)) {
  const declaration = new RegExp(`${alias}:\\s*var\\(${target}\\)\\s*;`);
  if (!declaration.test(themeCss)) fail(`${alias} має лишатися alias-ом ${target}`);
  else console.log(`✅ ${alias} → ${target}`);
}

const colorSources = [
  resolve("src/styles"),
  resolve("src/templates"),
  resolve("src/favicon.svg.njk"),
  resolve("src/site.webmanifest.njk"),
  resolve("static/root"),
  resolve("static/og"),
  resolve("dist"),
];

function filesUnder(path) {
  if (!existsSync(path)) return [];
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(join(path, entry.name)) : [join(path, entry.name)]
  );
}

const colorFiles = [...new Set(colorSources.flatMap(filesUnder))];
const retainedCss = colorFiles.filter((file) =>
  file.startsWith(`${distDir}/styles/`)
  && /^(?:site|print)\.[a-f0-9]{12}\.css$/i.test(file.slice(file.lastIndexOf("/") + 1))
);
const activeCss = new Set(selectActiveCssFiles(distDir, retainedCss));
const auditedFiles = colorFiles
  .filter((file) => /\.(?:css|njk|svg|webmanifest)$/i.test(file))
  // Старі fingerprints лишаються для N-1 кешованого HTML, але не є активною темою.
  .filter((file) => !retainedCss.includes(file) || activeCss.has(file));
const allowedHex = new Set(Object.values(baseColors));
for (const file of auditedFiles) {
  const content = readFileSync(file, "utf8");
  for (const match of content.matchAll(/#[0-9a-f]{3,8}\b/gi)) {
    if (allowedHex.has(match[0].toLowerCase())) continue;
    const line = content.slice(0, match.index).split("\n").length;
    fail(`${file.slice(process.cwd().length + 1)}:${line} — недозволений колір ${match[0]}`);
  }
}
console.log(`✅ HEX перевірено у ${auditedFiles.length} вихідних файлах.`);

const legacyTokens = /var\(--(?:canvas|plum|navy|green|ash|charcoal|bone|amber|seal|record|living|rule)(?![a-z-])/;
for (const file of auditedFiles.filter((path) => /\.(?:css|njk)$/i.test(path))) {
  const content = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of content.matchAll(/\b(?:rgb|rgba|hsl|hsla)\s*\(/gi)) {
    const line = content.slice(0, match.index).split("\n").length;
    fail(`${file.slice(process.cwd().length + 1)}:${line} — колір має походити з themes.css, не з ${match[0].trim()}`);
  }
  for (const match of content.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const declarations = match[2];
    if (legacyTokens.test(declarations)) {
      fail(`${file.slice(process.cwd().length + 1)} — залишився токен старої палітри.`);
    }
    if (
      /color\s*:\s*var\(--(?:ink-dim|text-dim)\)/.test(declarations)
      && /(?:font(?:-size)?\s*:[^;]*--text-xs)/.test(declarations)
    ) {
      const line = content.slice(0, match.index).split("\n").length;
      fail(`${file.slice(process.cwd().length + 1)}:${line} — тьмяний текст не може бути меншим за 14px.`);
    }
  }
}

const contrastPairs = [
  { type: "AAA body", name: "--ink on --paper", foreground: baseColors.ink, background: baseColors.paper, minimum: 7 },
  { type: "AAA body", name: "--ink-dim on --paper", foreground: baseColors["ink-dim"], background: baseColors.paper, minimum: 7 },
  { type: "AAA body", name: "--text-night on --night", foreground: baseColors["text-night"], background: baseColors.night, minimum: 7 },
  { type: "AAA body", name: "--text-dim on --night", foreground: baseColors["text-dim"], background: baseColors.night, minimum: 7 },
  { type: "AA UI", name: "--accent on --paper", foreground: baseColors.accent, background: baseColors.paper, minimum: 4.5 },
  { type: "AA UI", name: "--accent-night on --night", foreground: baseColors["accent-night"], background: baseColors.night, minimum: 4.5 },
  { type: "AA UI", name: "--paper on --accent", foreground: baseColors.paper, background: baseColors.accent, minimum: 4.5 },
  { type: "AA UI (selection)", name: "--world-accent on --world-bg", foreground: baseColors["accent-night"], background: baseColors.night, minimum: 4.5 },
  { type: "Non-text", name: "--rule-strong on --paper", foreground: baseColors["rule-strong"], background: baseColors.paper, minimum: 3 },
  { type: "Non-text", name: "--rule-strong-night on --night", foreground: baseColors["rule-strong-night"], background: baseColors.night, minimum: 3 },
  { type: "Non-text", name: "--focus on --paper", foreground: baseColors.accent, background: baseColors.paper, minimum: 3 },
  { type: "Non-text", name: "--focus-night on --night", foreground: baseColors["accent-night"], background: baseColors.night, minimum: 3 },
];

for (const type of ["AAA body", "AA UI", "AA UI (selection)", "Non-text"]) {
  const minimum = type === "AAA body" ? 7 : type === "Non-text" ? 3 : 4.5;
  console.log(`--- ${type} (мінімум ${minimum}:1) ---`);
  for (const pair of contrastPairs.filter((candidate) => candidate.type === type)) {
    const ratio = contrast(pair.foreground, pair.background);
    if (ratio < pair.minimum) fail(`${pair.name}: ${ratio.toFixed(2)}:1 (потрібно ${pair.minimum}:1)`);
    else console.log(`✅ ${pair.name}: ${ratio.toFixed(2)}:1`);
  }
}

for (const [file, language] of [
  ["docs/design-system.md", "uk"],
  ["content/uk/pages/colophon.md", "uk"],
  ["content/en/pages/colophon.md", "en"],
]) {
  const content = readFileSync(resolve(file), "utf8");
  if (!content.includes(renderPaletteRatioTable(baseColors, language))) {
    fail(`${file}: таблиця контрасту не синхронізована з themes.css; запусти npm run build.`);
  }
}

for (const row of paletteRatioRows(baseColors)) {
  console.log(`  ${row[0]} на ${row[1]}: ${row[2]}:1`);
}

if (errors) console.error(`Помилок: ${errors}`);
else console.log("Палітра відповідає контрастності.");
process.exit(errors ? 1 : 0);
