#!/usr/bin/env node
// plan-lint.mjs: автономний лінтер плану
// Перевіряє: дублі номерів, пропуски, послідовність, підсумок.
// Використання: node scripts/plan-lint.mjs docs/PLAN.md

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Використання: node scripts/plan-lint.mjs <шлях_до_плану>");
  process.exit(1);
}

const absPath = resolve(filePath);
let content;

try {
  content = readFileSync(absPath, "utf-8");
} catch (err) {
  console.error(`Не вдалося прочитати файл: ${absPath}`);
  console.error(err.message);
  process.exit(1);
}

// Прибираємо code blocks, щоб не ловити номери в прикладах
const contentNoCode = content.replace(/```[\s\S]*?```/g, "");

// Знаходимо всі пронумеровані кроки: рядок починається з числа + крапка + пробіл
// Кроки можуть бути з відступом (акти 1–156) або без (157+) — лідерські пробіли дозволені.
const stepPattern = /^\s*(\d+)\.\s/gm;
const steps = [];
let match;
while ((match = stepPattern.exec(contentNoCode)) !== null) {
  steps.push(parseInt(match[1], 10));
}

if (steps.length === 0) {
  console.error("Кроків не знайдено. Перевір формат файлу.");
  process.exit(1);
}

// Перевірка 1: дублі номерів
const seen = new Map();
const duplicates = [];
for (const num of steps) {
  if (seen.has(num)) {
    duplicates.push(num);
  }
  seen.set(num, true);
}

// Перевірка 2: пропуски та послідовність
const sorted = [...steps].sort((a, b) => a - b);
const gaps = [];
for (let i = 1; i < sorted.length; i++) {
  if (sorted[i] - sorted[i - 1] > 1) {
    for (let j = sorted[i - 1] + 1; j < sorted[i]; j++) {
      gaps.push(j);
    }
  }
}

// Перевірка 3: перший і останній номер
const first = sorted[0];
const last = sorted[sorted.length - 1];

// Перевірка 4: лічильник по фазах
const phasePattern = /^## ФАЗА ([A-Z])/gm;
const phases = [];
let phaseMatch;
while ((phaseMatch = phasePattern.exec(contentNoCode)) !== null) {
  phases.push(phaseMatch[1]);
}

// Рахуємо кроки по фазах (між заголовками)
const phaseSections = contentNoCode.split(/^## ФАЗА /m).slice(1);
const phaseCounts = phaseSections.map((section) => {
  const matches = section.match(/^\s*(\d+)\.\s/gm);
  return matches ? matches.length : 0;
});

// Перевірка 5: підсумок у файлі
const summaryPattern = /\|\s*\*\*Разом\*\*\s*\|\s*\|?\s*\*{0,2}(\d+)\*{0,2}/;
const summaryMatch = contentNoCode.match(summaryPattern);
const declaredTotal = summaryMatch ? parseInt(summaryMatch[1], 10) : null;

// Перевірка 6: документаційні посилання на PLAN і DECISIONS.
const decisionsPath = resolve(absPath, "..", "DECISIONS.md");
const repoRoot = resolve(absPath, "..", "..");
const decisionsSections = new Set();
const decisionMajorSections = new Set();
let decisionsContent = "";
try {
  decisionsContent = readFileSync(decisionsPath, "utf-8");
} catch {
  // Відсутній DECISIONS.md дасть порожній набір і не зламає інші перевірки.
}

for (const section of decisionsContent.matchAll(/^##\s+(\d+)(?:\s*[–-]\s*(\d+))?\./gm)) {
  const firstSection = Number(section[1]);
  const lastSection = Number(section[2] || section[1]);
  for (let number = firstSection; number <= lastSection; number++) {
    decisionsSections.add(String(number));
    decisionMajorSections.add(number);
  }
}
for (const heading of decisionsContent.matchAll(/^#{2,6}\s+(\d+(?:\.\d+)+)\./gm)) {
  const identifier = heading[1];
  decisionsSections.add(identifier);
  decisionsSections.add(identifier.split(".")[0]);
}

function markdownFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
  });
}

const documentationFiles = [
  resolve(repoRoot, "README.md"),
  resolve(repoRoot, "AGENTS.md"),
  ...markdownFiles(resolve(repoRoot, "docs")),
].filter(existsSync);
const missingPlanRefs = [];
const missingDecisionRefs = [];
for (const path of documentationFiles) {
  const source = readFileSync(path, "utf-8").replace(/```[\s\S]*?```/g, "");
  for (const ref of source.matchAll(/\bPLAN\s+(\d+)(?:\s*[–-]\s*(\d+))?/g)) {
    const start = Number(ref[1]);
    const end = Number(ref[2] || ref[1]);
    if (start > last) {
      missingPlanRefs.push(`${path.replace(`${repoRoot}/`, "")}: PLAN ${start}`);
      continue;
    }
    for (let step = start; step <= Math.min(end, last); step++) {
      if (!seen.has(step)) missingPlanRefs.push(`${path.replace(`${repoRoot}/`, "")}: PLAN ${step}`);
    }
    if (end > last) missingPlanRefs.push(`${path.replace(`${repoRoot}/`, "")}: PLAN ${last + 1}`);
  }
  for (const ref of source.matchAll(/DECISIONS\.md[^\n]{0,120}?§\s*(\d+(?:\.\d+)?)/g)) {
    const section = ref[1];
    if (decisionsSections.size > 0 && !decisionsSections.has(section)) {
      missingDecisionRefs.push(`${path.replace(`${repoRoot}/`, "")}: §${section}`);
    }
  }
}

// Перевірка 7: кожен ACCEPT у плані має запис у реєстрі прийнятих ризиків.
const acceptPattern = /\bACCEPT\s+((?:[A-Z]\d+)(?:\s*[/,]\s*(?:ACCEPT\s+)?[A-Z]\d+)*)/g;
const planAccepts = [];
let acceptMatch;
while ((acceptMatch = acceptPattern.exec(contentNoCode)) !== null) {
  for (const id of acceptMatch[1].match(/[A-Z]\d+/g) || []) {
    planAccepts.push(id);
  }
}

const decisionAccepts = new Set();
for (const match of decisionsContent.matchAll(/^\s*###\s+42\.\d+\.\s+ACCEPT\s+((?:[A-Z]\d+)(?:\s*[/,]\s*[A-Z]\d+)*)/gm)) {
  for (const id of match[1].match(/[A-Z]\d+/g) || []) {
    decisionAccepts.add(id);
  }
}
const missingAccepts = [...new Set(planAccepts)].filter((id) => !decisionAccepts.has(id));

// Перевірка 8: G-15 — ключові твердження канону мають відповідати коду.
const canonicalErrors = [];
const canonicalFile = (relative) => {
  const path = resolve(repoRoot, relative);
  try {
    return readFileSync(path, "utf8");
  } catch {
    canonicalErrors.push(`${relative}: файл відсутній`);
    return "";
  }
};
const canonicalAssert = (condition, message) => {
  if (!condition) canonicalErrors.push(message);
};
const readJson = (relative) => {
  try {
    return JSON.parse(canonicalFile(relative));
  } catch {
    canonicalErrors.push(`${relative}: невалідний JSON`);
    return {};
  }
};

const readme = canonicalFile("README.md");
const state = canonicalFile("docs/STATE.md");
const sitemap = canonicalFile("docs/sitemap.md");
const deploy = canonicalFile("docs/deploy.md");
const standards = canonicalFile("docs/TECH_STANDARDS.md");
const facts = canonicalFile("docs/facts.md");
const header = canonicalFile("src/templates/header.njk");
const footer = canonicalFile("src/templates/footer.njk");
const packageJson = readJson("package.json");
const lighthouseDesktop = readJson(".lighthouserc.json");
const lighthouseMobile = readJson(".lighthouserc.mobile.json");

canonicalAssert(packageJson.dependencies?.["@11ty/eleventy"] === "3.1.8",
  "package.json: Eleventy має бути 3.1.8");
canonicalAssert(!existsSync(resolve(repoRoot, "static/fonts")),
  "static/fonts/: мертві шрифти не видалені");
canonicalAssert(/static\/\s+зображення та favicon/.test(readme),
  "README.md: структура static/ не відповідає фактичній");
canonicalAssert(/Eleventy v3\.1\.8/.test(readme),
  "README.md: версія Eleventy застаріла");
canonicalAssert(/\*\*Шапка:\*\* 4 активні розділи/.test(sitemap),
  "docs/sitemap.md: шапка не описана як 4 активні розділи");
canonicalAssert(/\*\*Підвал:\*\* 6 посилань[\s\S]*Доступність/.test(sitemap),
  "docs/sitemap.md: футер не описаний як 6 посилань із доступністю");
canonicalAssert(/\| `\/poetry\/` \|[^\n]*\| Головна, шапка \|/.test(sitemap),
  "docs/sitemap.md: Поезія не визначена як пункт шапки");
canonicalAssert(sitemap.includes("| `/404.html` |"), "docs/sitemap.md: відсутній /404.html");
canonicalAssert(sitemap.includes("| 11 | `/accessibility/` |"), "docs/sitemap.md: відсутня /accessibility/");
canonicalAssert(/primary = `koztechie\.fyi`/.test(deploy),
  "docs/deploy.md: primary не вказує на .fyi");
canonicalAssert(/\| CSS \+ favicon \(сумарно\) \| ≤ 25 КБ/.test(standards),
  "docs/TECH_STANDARDS.md: бюджет CSS + favicon не дорівнює 25 КБ");
canonicalAssert(/\| Lighthouse accessibility \| = 100; error gate/.test(standards),
  "docs/TECH_STANDARDS.md: Lighthouse accessibility не має error gate 100");
canonicalAssert(/\| HTML `<title>` \| 1 непорожній; ≤ 60 символів у кожному `dist\/\*\*\/\*\.html`/.test(standards),
  "docs/TECH_STANDARDS.md: відсутній бюджет title для кожного dist HTML");
canonicalAssert(/\| Meta description \| 1 непорожній; ≤ 155 символів у кожному `dist\/\*\*\/\*\.html`/.test(standards),
  "docs/TECH_STANDARDS.md: відсутній бюджет description для кожного dist HTML");
canonicalAssert(/\| Lighthouse SEO \| ≥ 95; error gate/.test(standards),
  "docs/TECH_STANDARDS.md: Lighthouse SEO не має error gate");
canonicalAssert(!/\[заповнити\]/i.test(facts),
  "docs/facts.md: залишилися placeholder-факти");

const decisionSectionCount = decisionMajorSections.size;
const stateGateRows = state.match(/^\|\s*[ABC]\s*\|\s*\d+[–-]\d+\s*\|\s*(\d+)\s*\|/gm) || [];
const gateIds = new Set(stateGateRows.map((row) => Number(row.match(/^\|\s*[ABC]\s*\|\s*\d+[–-]\d+\s*\|\s*(\d+)/)?.[1])));
const stateLog = state.split(/^## 4\./m)[1] || "";
const gateLogEntries = [...stateLog.matchAll(/\bБРАМА\s+(\d+)\b([^|\n]*)/g)];
const missingGateIds = [...new Set(gateLogEntries.map((entry) => Number(entry[1])).filter((id) => !gateIds.has(id)))];
const gateStatusMismatches = [];
for (const entry of gateLogEntries) {
  const gate = Number(entry[1]);
  const context = entry[2];
  const closedInLog = /ЗАКРИТО|✅/i.test(context);
  const pendingInLog = /⏳|не закрито|лиш[а-яіїє]*ться/i.test(context);
  const gateRow = stateGateRows.find((row) => Number(row.match(/^\|\s*[ABC]\s*\|\s*\d+[–-]\d+\s*\|\s*(\d+)/)?.[1]) === gate);
  if (!gateRow) continue;
  const closedInTable = /✅/.test(gateRow);
  const pendingInTable = /⏳/.test(gateRow);
  if ((closedInLog && !closedInTable) || (pendingInLog && closedInTable)) {
    gateStatusMismatches.push(`БРАМА ${gate}: таблиця ${closedInTable ? "✅" : pendingInTable ? "⏳" : "без статусу"}, лог ${closedInLog ? "✅" : "⏳"}`);
  }
}
const readmeDecisionCount = Number(readme.match(/^\| `docs\/DECISIONS\.md` \|[^|\n]*?(\d+)\s+розділ/m)?.[1]);
const readmePlanCount = Number(readme.match(/^\| `docs\/PLAN\.md` \|[^|\n]*?(\d+)\s+кроків/m)?.[1]);
const readmeGateCount = Number(readme.match(/^\| `docs\/PLAN\.md` \|[^|\n]*?(\d+)\s+брам/m)?.[1]);
canonicalAssert(readmeDecisionCount === decisionSectionCount,
  `README.md: зазначено ${readmeDecisionCount || "невідому кількість"} розділів DECISIONS, фактично ${decisionSectionCount}`);
canonicalAssert(readmePlanCount === steps.length,
  `README.md: зазначено ${readmePlanCount || "невідому кількість"} кроків PLAN, фактично ${steps.length}`);
canonicalAssert(readmeGateCount === gateIds.size,
  `README.md: зазначено ${readmeGateCount || "невідому кількість"} брам STATE, фактично ${gateIds.size}`);

const headerNav = header.match(/set nav = \[([\s\S]*?)\]/)?.[1] || "";
const footerNav = footer.match(/set nav = \[([\s\S]*?)\]/)?.[1] || "";
canonicalAssert((headerNav.match(/\bhref:/g) || []).length === 4,
  "header.njk: кількість активних розділів не дорівнює 4");
canonicalAssert((footerNav.match(/\bhref:/g) || []).length === 6 &&
  footerNav.includes('key: "accessibility"') &&
  !footerNav.includes('key: "poetry"'),
  "footer.njk: має бути 6 посилань, включно з accessibility, без poetry");

const lighthouseConfigs = [lighthouseDesktop, lighthouseMobile];
for (const [index, config] of lighthouseConfigs.entries()) {
  const name = index === 0 ? ".lighthouserc.json" : ".lighthouserc.mobile.json";
  const assertions = config.ci?.assert?.assertions || {};
  canonicalAssert(
    assertions["categories:accessibility"]?.[0] === "error" &&
      assertions["categories:accessibility"]?.[1]?.minScore === 1,
    `${name}: accessibility має бути error з minScore=1`
  );
  canonicalAssert(
    assertions["categories:seo"]?.[0] === "error" &&
      assertions["categories:seo"]?.[1]?.minScore === 0.95,
    `${name}: SEO має бути error з minScore=0.95`
  );
}

// Вивід результатів
console.log("=== PLAN-LINT ===");
console.log(`Файл: ${absPath}`);
console.log(`Знайдено кроків: ${steps.length}`);
console.log(`Діапазон: ${first}–${last}`);
console.log(`Фаз: ${phases.length} (${phases.join(", ")})`);
console.log(`Кроків по фазах: ${phaseCounts.join(", ")}`);
console.log("");

let hasErrors = false;

// Дублі
if (duplicates.length > 0) {
  const unique = [...new Set(duplicates)];
  console.log(`❌ ДУБЛІ НОМЕРІВ: ${unique.join(", ")}`);
  hasErrors = true;
} else {
  console.log("✅ Дублів немає");
}

// Пропуски
if (gaps.length > 0) {
  console.log(`❌ ПРОПУСКИ: ${gaps.join(", ")}`);
  hasErrors = true;
} else {
  console.log("✅ Пропусків немає");
}

// Послідовність
if (steps[0] !== 1) {
  console.log(`❌ ПЕРШИЙ НОМЕР: ${steps[0]} (має бути 1)`);
  hasErrors = true;
} else {
  console.log("✅ Перший номер — 1");
}

// Підсумок
if (declaredTotal !== null) {
  if (declaredTotal === steps.length) {
    console.log(`✅ Підсумок: ${declaredTotal} = ${steps.length}`);
  } else {
    console.log(`❌ ПІДСУМОК: заявлений ${declaredTotal}, фактичний ${steps.length}`);
    hasErrors = true;
  }
} else {
  console.log("⚠️  Підсумок не знайдено у файлі");
}

// Перехресні посилання на PLAN і DECISIONS.
if (missingPlanRefs.length > 0) {
  console.log(`❌ Посилання на неіснуючі кроки PLAN: ${[...new Set(missingPlanRefs)].join(", ")}`);
  hasErrors = true;
} else {
  console.log("✅ Посилання на кроки PLAN валідні");
}

if (missingDecisionRefs.length > 0) {
  console.log(`❌ Посилання на неіснуючі розділи DECISIONS.md: ${[...new Set(missingDecisionRefs)].join(", ")}`);
  hasErrors = true;
} else if (decisionsSections.size > 0) {
  console.log("✅ Усі посилання на DECISIONS.md валідні");
}

if (missingGateIds.length > 0 || gateStatusMismatches.length > 0) {
  const details = [
    ...missingGateIds.map((gate) => `БРАМА ${gate}: є в логові, але немає в таблиці`),
    ...gateStatusMismatches,
  ];
  console.log(`❌ STATE: таблиця брам і лог не збігаються: ${details.join("; ")}`);
  hasErrors = true;
} else {
  console.log("✅ STATE: таблиця брам узгоджена з логом");
}

if (missingAccepts.length > 0) {
  console.log(`❌ ACCEPT без запису в DECISIONS.md §42: ${missingAccepts.join(", ")}`);
  hasErrors = true;
} else if (planAccepts.length > 0) {
  console.log(`✅ Усі ACCEPT мають записи в DECISIONS.md §42 (${[...new Set(planAccepts)].join(", ")})`);
} else {
  console.log("✅ ACCEPT-маркерів у плані немає");
}

if (canonicalErrors.length > 0) {
  console.log(`❌ G-15 КАНОН-ДРЕЙФ:\n   ${canonicalErrors.join("\n   ")}`);
  hasErrors = true;
} else {
  console.log("✅ G-15: ключові твердження канону відповідають коду");
}

console.log("");

if (hasErrors) {
  console.log("РЕЗУЛЬТАТ: помилки знайдено");
  process.exit(1);
} else {
  console.log("РЕЗУЛЬТАТ: все чисто");
  process.exit(0);
}
