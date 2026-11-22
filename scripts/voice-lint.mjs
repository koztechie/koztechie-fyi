#!/usr/bin/env node
// voice-lint.mjs: перевіряє публічний Markdown, мовні словники й шаблони.
// Без аргументів сканує content/ та src/.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { extname, relative, resolve } from "node:path";

const supportedExtensions = new Set([".md", ".njk", ".json"]);
const args = process.argv.slice(2);

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (supportedExtensions.has(extname(path))) files.push(path);
  }
  return files;
}

function globToRegExp(glob) {
  let pattern = "";
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    if (char === "*" && glob[i + 1] === "*") {
      if (glob[i + 2] === "/") {
        pattern += "(?:.*/)?";
        i += 2;
      } else {
        pattern += ".*";
        i++;
      }
    } else if (char === "*") {
      pattern += "[^/]*";
    } else if (char === "?") {
      pattern += "[^/]";
    } else {
      pattern += char.replace(/[\\^$+.()|[\]{}]/g, "\\$&");
    }
  }
  return new RegExp(`^${pattern}$`);
}

function resolveTargets(pattern) {
  const absolute = resolve(pattern);
  if (existsSync(absolute)) {
    return statSync(absolute).isDirectory()
      ? walk(absolute)
      : supportedExtensions.has(extname(absolute)) ? [absolute] : [];
  }
  if (!/[*?]/.test(pattern)) return [];

  const root = resolve(".");
  const matcher = globToRegExp(pattern.replaceAll("\\", "/"));
  return walk(root).filter((path) =>
    matcher.test(relative(root, path).replaceAll("\\", "/"))
  );
}

const targets = [...new Set(
  (args.length ? args : ["content/", "src/"]).flatMap(resolveTargets)
)].sort();
if (targets.length === 0) {
  console.error("Використання: node scripts/voice-lint.mjs <файл|директорія|glob>");
  process.exit(1);
}

// Заборона лексична: заперечення, лапки, цитування й іронія не є винятками.
const bannedRoots = [
  { label: "пасіонарний", source: "пасіонарн\\p{L}*" },
  { label: "експерт", source: "експерт\\p{L}*" },
  { label: "expert", source: "expert\\p{L}*" },
  { label: "гуру", source: "гуру\\p{L}*" },
  { label: "унікальний", source: "унікальн\\p{L}*" },
  { label: "історія успіху", source: "історі\\p{L}*\\s+успіх\\p{L}*" },
  { label: "надихаючий", source: "надихаюч\\p{L}*" },
  { label: "в ресурсі", source: "в\\s+ресурс\\p{L}*" },
  { label: "лідер думок", source: "лідер\\p{L}*\\s+думк\\p{L}*" },
];
const socialPatterns = [
  { name: "Facebook", regex: /facebook\.com|fb\.com/gi },
  { name: "Twitter/X", regex: /twitter\.com|x\.com/gi },
  { name: "Instagram", regex: /instagram\.com/gi },
  { name: "LinkedIn", regex: /linkedin\.com/gi },
  { name: "Bluesky", regex: /bsky\.app/gi },
  { name: "YouTube", regex: /youtube\.com|youtu\.be/gi },
  { name: "dev.to", regex: /dev\.to/gi },
];
const ctaPatterns = [
  { name: "«тисни»", regex: /тисни/gi },
  { name: "«натисни сюди»", regex: /натисни сюди/gi },
  { name: "«поділитися»", regex: /поділитися|поділіться/gi, skipQuoted: true },
  { name: "«підпишись»", regex: /підпишись|підпишіться/gi },
  { name: "«лайкніть»", regex: /лайкніть|лайкни/gi },
  { name: "«дізнайся більше»", regex: /дізнайся більше/gi },
];

function collectJsonStrings(value, path = [], output = []) {
  if (typeof value === "string") {
    output.push(`${path.join(".")}: ${value}`);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => collectJsonStrings(item, [...path, index], output));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      collectJsonStrings(item, [...path, key], output);
    }
  }
  return output.join("\n");
}

function textToScan(filePath, content) {
  const extension = extname(filePath);
  if (extension === ".json") {
    try {
      return collectJsonStrings(JSON.parse(content));
    } catch (error) {
      return { error: `Невалідний JSON: ${error.message}` };
    }
  }
  if (extension === ".njk") {
    return content.replace(/\{#[\s\S]*?#\}/g, "").replace(/<!--[\s\S]*?-->/g, "");
  }
  // Markdown frontmatter є частиною публічного контракту: сканується разом із тілом.
  return content;
}

function lint(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const scanResult = textToScan(filePath, content);
  const scanText = typeof scanResult === "string" ? scanResult : "";
  const isMarkdown = extname(filePath) === ".md";
  const body = isMarkdown ? content.replace(/^---[\s\S]*?---\n/, "") : "";
  const errors = [];
  const warnings = [];

  if (typeof scanResult !== "string") errors.push(scanResult.error);

  for (const { label, source } of bannedRoots) {
    const regex = new RegExp(`(?:^|[^\\p{L}])(${source})(?=$|[^\\p{L}])`, "giu");
    const matches = [...scanText.matchAll(regex)].map((match) => match[1]);
    if (matches.length) {
      errors.push(`Заборонене слово «${label}»: ${[...new Set(matches)].join(", ")}`);
    }
  }

  // Редакційні перевірки застосовуються до Markdown-тексту; заборонена лексика
  // вище перевіряється в усьому frontmatter, тілах, JSON-рядках і шаблонах.
  if (isMarkdown) {
    for (const { name, regex } of socialPatterns) {
      const matches = body.match(regex);
      if (matches) errors.push(`Посилання на ${name}: ${matches.length} згадок (§3 забороняє)`);
    }

    const emojiMatches = body.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu);
    if (emojiMatches) warnings.push(`Емодзі: ${emojiMatches.length} шт. (§33.2 забороняє)`);

    for (const { name, regex, skipQuoted } of ctaPatterns) {
      const hay = skipQuoted ? body.replace(/«поділитися»|«поділіться»/gi, "") : body;
      const matches = hay.match(regex);
      if (matches) errors.push(`Заклик ${name}: ${matches.length} згадок`);
    }

    const utmMatches = body.match(/[?&]utm_/gi);
    if (utmMatches) errors.push(`UTM-параметри: ${utmMatches.length} згадок`);

    const headings = body.match(/^#{1,3}\s+.+$/gm) || [];
    for (const heading of headings) {
      if (/(^|[^\p{L}])(\d+)\s+(спосіб|причин|помилок|порад|речей|секрет)/iu.test(heading)) {
        errors.push(`Клікбейт у заголовку: «${heading.trim()}»`);
      }
      if (/!/.test(heading)) warnings.push(`Оклик у заголовку: «${heading.trim()}»`);
    }

    if (/(^|[^\p{L}])привіт[,.]?\s+я/iu.test(body)) {
      errors.push("Шаблонний вступ «Привіт, я...» (§6)");
    }
  }
  return { errors, warnings, words: scanText.split(/\s+/).filter(Boolean).length };
}

let totalErrors = 0;
let totalWarnings = 0;
for (const filePath of targets) {
  const result = lint(filePath);
  totalErrors += result.errors.length;
  totalWarnings += result.warnings.length;
  console.log(`=== VOICE-LINT: ${relative(".", filePath)} ===`);
  console.log(`Слів: ${result.words}`);
  for (const error of result.errors) console.log(`❌ ${error}`);
  for (const warning of result.warnings) console.log(`⚠️ ${warning}`);
  console.log(result.errors.length ? "РЕЗУЛЬТАТ: помилки знайдено" : result.warnings.length ? "РЕЗУЛЬТАТ: лише попередження" : "✅ Чисто");
  console.log("");
}

// У повному режимі перший екран головної має називати архів, не професію автора.
if (args.length === 0) {
  const archiveIdentity = [
    {
      lang: "uk",
      file: resolve("src/_data/strings/uk.json"),
      homeContent: resolve("content/uk/index.md"),
      canonical: "Архів проєктів, коду й текстів.",
    },
    {
      lang: "en",
      file: resolve("src/_data/strings/en.json"),
      homeContent: resolve("content/en/index.md"),
      canonical: "An archive of projects, code, and writing.",
    },
  ];
  let archiveErrors = 0;
  const homeTemplate = readFileSync(resolve("src/templates/home.njk"), "utf-8");
  if (!homeTemplate.includes("{{ strings.home.thesis }}") || homeTemplate.includes('"jobTitle"')) {
    console.log("❌ ARCHIVE IDENTITY: h1 має використовувати канонічний архівний текст; Person.jobTitle не повинен задавати професійне позиціювання");
    archiveErrors++;
  }
  for (const item of archiveIdentity) {
    let strings;
    try {
      strings = JSON.parse(readFileSync(item.file, "utf-8"));
    } catch {
      console.log(`❌ ARCHIVE IDENTITY (${item.lang}): не вдалося прочитати мовний словник`);
      archiveErrors++;
      continue;
    }
    const canonical = strings.home.thesis;
    const archiveWord = item.lang === "uk" ? "архів" : "archive";
    const surfaces = [
      ["h1", canonical],
      ["site.title", strings.site.title],
      ["site.bio_short", strings.site.bio_short],
      ["home.browser_title", strings.home.browser_title],
    ];
    for (const [surface, value] of surfaces) {
      const aligned = surface === "h1"
        ? value === canonical
        : typeof value === "string" && value.toLowerCase().includes(archiveWord);
      if (!aligned) {
        console.log(`❌ ARCHIVE IDENTITY (${item.lang}): ${surface} не містить канонічне повідомлення про архів`);
        archiveErrors++;
      }
    }
    const homeMarkdown = readFileSync(item.homeContent, "utf-8");
    const summary = homeMarkdown.match(/^summary:\s*["'](.+?)["']\s*$/m)?.[1] || "";
    if (!summary.toLowerCase().includes(archiveWord)) {
      console.log(`❌ ARCHIVE IDENTITY (${item.lang}): головний summary/OG description не містить канонічне повідомлення про архів`);
      archiveErrors++;
    }
  }
  totalErrors += archiveErrors;
  if (archiveErrors === 0) {
    console.log("=== ARCHIVE IDENTITY ===");
    console.log("✅ H1, browser title, site title та описи головної узгоджені з архівним каноном (uk/en).");
    console.log("");
  }
}

console.log(`Перевірено файлів голосу: ${targets.length}`);
console.log(`Підсумок: помилки ${totalErrors}, попередження ${totalWarnings}`);
if (totalErrors) process.exit(1);
