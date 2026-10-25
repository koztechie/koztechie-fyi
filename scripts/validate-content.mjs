#!/usr/bin/env node
// validate-content.mjs: валідатор контенту ВУЗОЛ-0
// Перевіряє: обов'язкові поля, ISO-дати, довжини, tags ≤ 5, slug, entry, translation_status, consent.
// Використання: node scripts/validate-content.mjs content/

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dirPath = process.argv[2];

if (!dirPath) {
  console.error("Використання: node scripts/validate-content.mjs <тека_контенту>");
  process.exit(1);
}

const absDir = resolve(dirPath);
let files;

try {
  files = walkDir(absDir).filter((f) => f.endsWith(".md"));
} catch (err) {
  console.error(`Не вдалося прочитати теку: ${absDir}`);
  console.error(err.message);
  process.exit(1);
}

if (files.length === 0) {
  console.log("Файлів .md не знайдено.");
  process.exit(0);
}

// Словники (крок 119): канонічні списки — єдине джерело правди
// (content-model.md §3.2: «Заголовки секцій через словники,
// валідатор перевіряє порядок і наявність»).
// Fallback — вбудовані значення: валідатор лишається автономним.
const here = dirname(fileURLToPath(import.meta.url));
const stringsPath = join(here, "..", "src", "_data", "strings");
const loadJson = (name) => {
  const p = join(stringsPath, name);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
};
const stringsUk = loadJson("uk.json");
const stringsEn = loadJson("en.json");
const stringsSource = stringsUk ? "словники" : "вбудовані значення";

// Допустимі значення
const VALID_LANG = ["uk", "en"];
const VALID_TRANSLATION = ["complete", "partial", "not_planned"];
const VALID_WARNING = stringsUk?.post?.warnings
  ? Object.keys(stringsUk.post.warnings)
  : ["війна", "здоровʼя", "травма", "смерть", "залежність"];
const VALID_LAYOUT = ["page.njk", "nichlyst.njk", "post.njk", "poetry.njk"];
// Секції кейсу за мовою (content-model §3.2): uk-кейс — українські заголовки,
// en-кейс — англійські. Словники — єдине джерело порядку та складу.
const FALLBACK_CASE_SECTIONS = [
  "Роль",
  "Період",
  "Задача",
  "Рішення",
  "Що зламалося",
  "Що викинув би",
  "Що це мені дало",
];
const caseSectionsFor = (lang) =>
  (lang === "en" ? stringsEn?.case_sections : stringsUk?.case_sections) || FALLBACK_CASE_SECTIONS;

let totalErrors = 0;
let totalWarnings = 0;

console.log("=== VALIDATE-CONTENT ===");
console.log(`Тека: ${absDir}`);
console.log(`Файлів: ${files.length}`);
console.log(`Канонічні списки: ${stringsSource}`);
console.log("");

for (const file of files) {
  const content = readFileSync(file, "utf-8");
  const relPath = file.replace(absDir + "/", "");
  const errors = [];
  const warnings = [];

  // Парсимо front matter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) {
    errors.push("Немає YAML front matter");
    totalErrors += errors.length;
    report(relPath, errors, warnings);
    continue;
  }

  const fm = parseYaml(fmMatch[1]);
  const body = content.slice(fmMatch[0].length);
  const filename = basename(file, ".md");

  // Визначаємо тип за шляхом
  const type = detectType(relPath, fm);

  // 1. Обов'язкові поля за типом
  const required = getRequiredFields(type);
  for (const field of required) {
    if (fm[field] === undefined || fm[field] === null || fm[field] === "") {
      errors.push(`Відсутнє обов'язкове поле: ${field}`);
    }
  }

  // 2. lang
  if (fm.lang && !VALID_LANG.includes(fm.lang)) {
    errors.push(`lang: недопустиме значення «${fm.lang}» (має бути uk/en)`);
  }

  // 3. translation_status
  if (fm.translation_status && !VALID_TRANSLATION.includes(fm.translation_status)) {
    errors.push(`translation_status: недопустиме значення «${fm.translation_status}»`);
  }

  // 4. translation_status: complete без en-файлу
  if (fm.translation_status === "complete" && fm.lang === "uk") {
    const enFile = file.replace("/uk/", "/en/");
    try {
      statSync(enFile);
    } catch {
      errors.push("translation_status: complete, але en-файл не існує");
    }
  }

  // 5. content_warning
  if (fm.content_warning && !VALID_WARNING.includes(fm.content_warning)) {
    errors.push(`content_warning: недопустиме значення «${fm.content_warning}»`);
  }

  // 6. layout
  if (fm.layout && !VALID_LAYOUT.includes(fm.layout)) {
    errors.push(`layout: недопустиме значення «${fm.layout}»`);
  }

  // 7. Дати (ISO 8601)
  const dateFields = ["date", "updated", "written"];
  for (const field of dateFields) {
    if (fm[field] && !/^\d{4}-\d{2}-\d{2}$/.test(String(fm[field]))) {
      errors.push(`${field}: не ISO 8601 («${fm[field]}»)`);
    }
  }

  // 8. Довжини
  if (fm.title && fm.title.length > 200) {
    errors.push(`title: занадто довгий (${fm.title.length} символів, максимум 200)`);
  }
  if (fm.summary && fm.summary.length > 160) {
    errors.push(`summary: занадто довгий (${fm.summary.length} символів, максимум 160)`);
  }

  // 9. tags ≤ 5
  if (fm.tags && Array.isArray(fm.tags) && fm.tags.length > 5) {
    errors.push(`tags: ${fm.tags.length} тегів (максимум 5)`);
  }

  // 10. slug
  if (fm.slug && /\d{4}|\d{2}-\d{2}|\d{4}-\d{2}/.test(fm.slug)) {
    errors.push(`slug: містить цифри дати («${fm.slug}»)`);
  }

  // 11. entry (унікальність перевіряється окремо)
  if (fm.entry !== undefined && !Number.isInteger(Number(fm.entry))) {
    errors.push(`entry: не ціле число («${fm.entry}»)`);
  }

  // 12. Кейс: consent
  if (type === "case" && !fm.consent) {
    errors.push("Кейс: відсутнє поле consent (письмова згода роботодавця)");
  }

  // 13. Кейс: 7 секцій (за мовою файлу)
  if (type === "case") {
    for (const section of caseSectionsFor(fm.lang)) {
      if (!body.includes(`## ${section}`)) {
        errors.push(`Кейс: відсутня секція «${section}»`);
      }
    }
  }

  // 14. Цвинтар: epitaph — одне речення
  if (type === "graveyard" && fm.epitaph) {
    const sentences = fm.epitaph.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length > 1) {
      warnings.push(`epitaph: ${sentences.length} речень (має бути одне)`);
    }
  }

  // 15. draft
  if (fm.draft !== undefined && typeof fm.draft !== "boolean") {
    errors.push(`draft: не boolean («${fm.draft}»)`);
  }

  // 16. Порожній body
  if (body.trim().length === 0) {
    warnings.push("Тіло файлу порожнє");
  }

  totalErrors += errors.length;
  totalWarnings += warnings.length;

  if (errors.length > 0 || warnings.length > 0) {
    report(relPath, errors, warnings);
  }
}

// Перевірка унікальності entry
console.log("");
console.log("--- Унікальність entry ---");
const entries = new Map();
for (const file of files) {
  const content = readFileSync(file, "utf-8");
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) continue;
  const fm = parseYaml(fmMatch[1]);
  if (fm.entry !== undefined) {
    const relPath = file.replace(absDir + "/", "");
    if (entries.has(fm.entry)) {
      console.log(`❌ entry ${fm.entry}: дублікат (${entries.get(fm.entry)} і ${relPath})`);
      totalErrors++;
    } else {
      entries.set(fm.entry, relPath);
    }
  }
}
if (entries.size > 0) {
  console.log(`✅ entry: ${entries.size} унікальних значень`);
}

// Підсумок
console.log("");
console.log("=== ПІДСУМОК ===");
console.log(`Файлів: ${files.length}`);
console.log(`Помилок: ${totalErrors}`);
console.log(`Попереджень: ${totalWarnings}`);
console.log("");

if (totalErrors > 0) {
  console.log("РЕЗУЛЬТАТ: помилки знайдено");
  process.exit(1);
} else {
  console.log("РЕЗУЛЬТАТ: все чисто");
  process.exit(0);
}

// Допоміжні функції

function walkDir(dir) {
  const results = [];
  const list = readdirSync(dir);
  for (const item of list) {
    const full = join(dir, item);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function parseYaml(yaml) {
  const result = {};
  const lines = yaml.split("\n");
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2].trim();
      // Прибираємо лапки
      value = value.replace(/^["']|["']$/g, "");
      // Парсимо масиви
      if (value.startsWith("[") && value.endsWith("]")) {
        value = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      }
      // Парсимо boolean
      if (value === "true") value = true;
      if (value === "false") value = false;
      // Парсимо числа
      if (/^\d+$/.test(value)) value = parseInt(value, 10);
      result[key] = value;
    }
  }
  return result;
}

function detectType(relPath, fm) {
  if (relPath.includes("/graveyard/")) return "graveyard";
  if (relPath.includes("/practice/")) return "case";
  if (relPath.includes("/poetry/")) return "poem";
  if (relPath.includes("/blog/")) return "post";
  if (fm.layout === "nichlyst.njk") return "page";
  if (fm.layout === "page.njk") return "page";
  return "unknown";
}

function getRequiredFields(type) {
  const base = ["title", "lang", "translation_status"];
  switch (type) {
    case "post":
      return [...base, "slug", "entry", "date", "summary"];
    case "case":
      return [...base, "slug", "entry", "date", "summary", "consent"];
    case "graveyard":
      return [...base, "slug", "entry", "date", "period", "cause", "epitaph"];
    case "poem":
      return [...base, "slug", "entry", "date", "first_published"];
    case "page":
      return [...base, "layout", "updated"];
    default:
      return base;
  }
}

function report(relPath, errors, warnings) {
  console.log(`--- ${relPath} ---`);
  for (const err of errors) {
    console.log(`  ❌ ${err}`);
  }
  for (const warn of warnings) {
    console.log(`  ⚠️  ${warn}`);
  }
}
