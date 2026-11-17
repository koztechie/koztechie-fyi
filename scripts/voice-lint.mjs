#!/usr/bin/env node
// voice-lint.mjs: лінтер голосу для одного або кількох Markdown-файлів.
// Використання: node scripts/voice-lint.mjs content/
// або: node scripts/voice-lint.mjs "content/**/*.md"

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { relative, resolve } from "node:path";

const args = process.argv.slice(2);

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (path.endsWith(".md")) files.push(path);
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
    return statSync(absolute).isDirectory() ? walk(absolute) : [absolute];
  }
  if (!/[*?]/.test(pattern)) return [];

  const root = resolve(".");
  const matcher = globToRegExp(pattern.replaceAll("\\", "/"));
  return walk(root).filter((path) =>
    matcher.test(relative(root, path).replaceAll("\\", "/"))
  );
}

const targets = [...new Set((args.length ? args : ["content/"]).flatMap(resolveTargets))].sort();
if (targets.length === 0) {
  console.error("Використання: node scripts/voice-lint.mjs <файл|директорія|glob>");
  process.exit(1);
}

const bannedWords = [
  "пасіонарний", "експерт", "гуру", "унікальний досвід", "історія успіху",
  "надихаючий", "в ресурсі", "лідер думок", "унікальний",
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

function lint(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const body = content.replace(/^---[\s\S]*?---\n/, "");
  const errors = [];
  const warnings = [];

  for (const word of bannedWords) {
    const matches = body.match(new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, "giu"));
    if (matches) errors.push(`Заборонене слово «${word}»: ${matches.length} згадок`);
  }

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
  return { errors, warnings, words: body.split(/\s+/).filter(Boolean).length };
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

console.log(`Перевірено Markdown-файлів: ${targets.length}`);
console.log(`Підсумок: помилки ${totalErrors}, попередження ${totalWarnings}`);
if (totalErrors) process.exit(1);
