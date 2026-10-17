#!/usr/bin/env node
// voice-lint.mjs: лінтер голосу для контенту ВУЗОЛ-0
// Перевіряє: заборонені слова, посилання на соцмережі, емодзі, заклики, UTM.
// Використання: node scripts/voice-lint.mjs <файл>

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Використання: node scripts/voice-lint.mjs <шлях_до_файлу>");
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

// Прибираємо YAML front matter
const body = content.replace(/^---[\s\S]*?---\n/, "");

const errors = [];
const warnings = [];

// 1. Заборонені слова (DECISIONS.md §1)
const bannedWords = [
  "пасіонарний",
  "експерт",
  "гуру",
  "унікальний досвід",
  "історія успіху",
  "надихаючий",
  "в ресурсі",
  "лідер думок",
  "унікальний",
];

for (const word of bannedWords) {
  // \b не працює з кирилицею — використовуємо пробіли/межі рядка
  const regex = new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, "giu");
  const matches = body.match(regex);
  if (matches) {
    errors.push(`Заборонене слово «${word}»: ${matches.length} згадок`);
  }
}

// 2. Посилання на соцмережі (DECISIONS.md §3)
const socialPatterns = [
  { name: "Facebook", regex: /facebook\.com|fb\.com/gi },
  { name: "Twitter/X", regex: /twitter\.com|x\.com/gi },
  { name: "Instagram", regex: /instagram\.com/gi },
  { name: "LinkedIn", regex: /linkedin\.com/gi },
  { name: "Bluesky", regex: /bsky\.app/gi },
  { name: "YouTube", regex: /youtube\.com|youtu\.be/gi },
  { name: "dev.to", regex: /dev\.to/gi },
];

for (const { name, regex } of socialPatterns) {
  const matches = body.match(regex);
  if (matches) {
    errors.push(`Посилання на ${name}: ${matches.length} згадок (§3 забороняє)`);
  }
}

// 3. Емодзі (DECISIONS.md §33.2)
const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
const emojiMatches = body.match(emojiRegex);
if (emojiMatches) {
  warnings.push(`Емодзі: ${emojiMatches.length} шт. (§33.2 забороняє)`);
}

// 4. Заклики (DECISIONS.md §33.2)
const ctaPatterns = [
  { name: "«тисни»", regex: /\bтисни\b/gi },
  { name: "«натисни сюди»", regex: /натисни сюди/gi },
  { name: "«поділитися»", regex: /поділитися|поділіться/gi },
  { name: "«підпишись»", regex: /підпишись|підпишіться/gi },
  { name: "«лайкніть»", regex: /лайкніть|лайкни/gi },
  { name: "«дізнайся більше»", regex: /дізнайся більше/gi },
];

for (const { name, regex } of ctaPatterns) {
  const matches = body.match(regex);
  if (matches) {
    errors.push(`Заклик ${name}: ${matches.length} згадок`);
  }
}

// 5. UTM-параметри
const utmRegex = /[?&]utm_/gi;
const utmMatches = body.match(utmRegex);
if (utmMatches) {
  errors.push(`UTM-параметри: ${utmMatches.length} згадок`);
}

// 6. Клікбейт у заголовках (DECISIONS.md §28)
const headings = body.match(/^#{1,3}\s+.+$/gm) || [];
for (const heading of headings) {
  if (/(^|[^\p{L}])(\d+)\s+(спосіб|причин|помилок|порад|речей|секрет)/iu.test(heading)) {
    errors.push(`Клікбейт у заголовку: «${heading.trim()}»`);
  }
  if (/!/.test(heading)) {
    warnings.push(`Оклик у заголовку: «${heading.trim()}»`);
  }
}

// 7. «Привіт, я...» (DECISIONS.md §6)
if (/(^|[^\p{L}])привіт[,.]?\s+я/iu.test(body)) {
  errors.push("Шаблонний вступ «Привіт, я...» (§6)");
}

// Вивід результатів
console.log("=== VOICE-LINT ===");
console.log(`Файл: ${absPath}`);
console.log(`Слів: ${body.split(/\s+/).filter(Boolean).length}`);
console.log("");

if (errors.length > 0) {
  console.log(`❌ ПОМИЛКИ (${errors.length}):`);
  for (const err of errors) {
    console.log(`   - ${err}`);
  }
  console.log("");
}

if (warnings.length > 0) {
  console.log(`⚠️  ПОПЕРЕДЖЕННЯ (${warnings.length}):`);
  for (const warn of warnings) {
    console.log(`   - ${warn}`);
  }
  console.log("");
}

if (errors.length === 0 && warnings.length === 0) {
  console.log("✅ Чисто. Жодних порушень.");
  console.log("");
  console.log("РЕЗУЛЬТАТ: все чисто");
  process.exit(0);
} else if (errors.length === 0) {
  console.log("РЕЗУЛЬТАТ: лише попередження");
  process.exit(0);
} else {
  console.log("РЕЗУЛЬТАТ: помилки знайдено");
  process.exit(1);
}
