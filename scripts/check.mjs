#!/usr/bin/env node
// check.mjs: автономний чекліст ВУЗОЛ-0 (без залежностей)
// Перевіряє: бюджети, CSS-патерни, hex, сторонні origin, h1, alt, href, lang, entry.
// Використання: node scripts/check.mjs [dist/]

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { brotliCompressSync, constants as zlibConstants } from "node:zlib";

const distDir = resolve(process.argv[2] || "dist");
const stylesDir = resolve("src/styles");

let totalErrors = 0;
let totalWarnings = 0;

console.log("=== CHECK (ВУЗОЛ-0) ===");
console.log(`dist: ${distDir}`);
console.log("");

// 1. Бюджети
console.log("--- 1. Бюджети (після brotli) ---");
if (existsSync(distDir)) {
  const htmlFiles = walkDir(distDir).filter((f) => f.endsWith(".html"));
  let overBudget = 0;
  for (const file of htmlFiles) {
    const content = readFileSync(file);
    const brotli = brotliCompressSync(content, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 } });
    const sizeKB = brotli.length / 1024;
    if (sizeKB > 50) {
      const rel = file.replace(distDir + "/", "");
      console.log(`  ❌ ${rel}: ${sizeKB.toFixed(1)} КБ (бюджет 50 КБ)`);
      overBudget++;
      totalErrors++;
    }
  }
  if (overBudget === 0) {
    console.log(`  ✅ ${htmlFiles.length} HTML-файлів у межах бюджету 50 КБ`);
  }

  // 1b. Бюджет CSS (сумарно, brotli) — DECISIONS.md §39.4, TECH_STANDARDS §1
  const distCSS = walkDir(distDir).filter((f) => f.endsWith(".css"));
  if (distCSS.length > 0) {
    let totalCSS = 0;
    for (const file of distCSS) {
      const content = readFileSync(file);
      const brotli = brotliCompressSync(content, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 } });
      totalCSS += brotli.length;
    }
    const sizeKB = totalCSS / 1024;
    if (sizeKB > 15) {
      console.log(`  ❌ CSS сумарно: ${sizeKB.toFixed(1)} КБ (бюджет 15 КБ)`);
      totalErrors++;
    } else {
      console.log(`  ✅ CSS сумарно: ${sizeKB.toFixed(1)} КБ (бюджет 15 КБ)`);
    }
  }

  // 1c. style= атрибути — заборонені (TECH_STANDARDS §4)
  const htmlWithStyle = walkDir(distDir).filter((f) => f.endsWith(".html"));
  let styleAttrErrors = 0;
  for (const file of htmlWithStyle) {
    const content = readFileSync(file, "utf-8");
    const matches = content.match(/\sstyle\s*=\s*["']/gi);
    if (matches) {
      const rel = file.replace(distDir + "/", "");
      console.log(`  ❌ ${rel}: ${matches.length} style= атрибути`);
      styleAttrErrors++;
      totalErrors++;
    }
  }
  if (styleAttrErrors === 0) {
    console.log(`  ✅ Без style= атрибутів у HTML`);
  }
} else {
  console.log("  ⚠️  dist/ не існує. Пропущено.");
}
console.log("");

// 2. CSS-патерни
console.log("--- 2. Заборонені CSS-патерни ---");
const bannedCSS = [
  { pattern: /box-shadow/gi, name: "box-shadow" },
  { pattern: /text-shadow/gi, name: "text-shadow" },
  { pattern: /drop-shadow/gi, name: "drop-shadow" },
  { pattern: /linear-gradient/gi, name: "linear-gradient" },
  { pattern: /radial-gradient/gi, name: "radial-gradient" },
  { pattern: /backdrop-filter/gi, name: "backdrop-filter" },
  { pattern: /border-radius:\s*(\d+)px/gi, name: "border-radius", max: 4 },
];

if (existsSync(stylesDir)) {
  const cssFiles = walkDir(stylesDir).filter((f) => f.endsWith(".css"));
  let cssErrors = 0;
  for (const file of cssFiles) {
    const content = readFileSync(file, "utf-8");
    const rel = file.replace(stylesDir + "/", "");
    for (const { pattern, name, max } of bannedCSS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (max !== undefined) {
          const value = parseInt(match[1], 10);
          if (value <= max) continue;
        }
        const line = content.slice(0, match.index).split("\n").length;
        console.log(`  ❌ ${rel}:${line} — ${name}`);
        cssErrors++;
        totalErrors++;
      }
    }
  }
  if (cssErrors === 0) {
    console.log(`  ✅ ${cssFiles.length} CSS-файлів без заборонених патернів`);
  }
} else {
  console.log("  ⚠️  src/styles/ не існує. Пропущено.");
}
console.log("");

// 3. Hex поза themes.css/nichlyst.css
console.log("--- 3. Hex поза themes.css/nichlyst.css ---");
const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
if (existsSync(stylesDir)) {
  const cssFiles = walkDir(stylesDir).filter(
    (f) => f.endsWith(".css") && !f.includes("themes") && !f.includes("nichlyst") && !f.includes("print")
  );
  let hexErrors = 0;
  for (const file of cssFiles) {
    const content = readFileSync(file, "utf-8");
    const rel = file.replace(stylesDir + "/", "");
    const matches = content.match(hexRegex);
    if (matches) {
      for (const m of matches) {
        const line = content.slice(0, content.indexOf(m)).split("\n").length;
        console.log(`  ❌ ${rel}:${line} — hex ${m}`);
        hexErrors++;
        totalErrors++;
      }
    }
  }
  if (hexErrors === 0) {
    console.log("  ✅ Hex лише в themes.css/nichlyst.css/print.css");
  }
} else {
  console.log("  ⚠️  src/styles/ не існує. Пропущено.");
}
console.log("");

// 4. Сторонні origin у dist/
console.log("--- 4. Сторонні origin у dist/ ---");
const externalRegex = /https?:\/\/(?!koztechie\.fyi|localhost|127\.0\.0\.1)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
if (existsSync(distDir)) {
  const distFiles = walkDir(distDir).filter((f) => [".html", ".css", ".js", ".xml"].includes(extname(f)));
  let extErrors = 0;
  for (const file of distFiles) {
    const content = readFileSync(file, "utf-8");
    const rel = file.replace(distDir + "/", "");
    const matches = content.match(externalRegex);
    if (matches) {
      const unique = [...new Set(matches)];
      for (const m of unique) {
        // Дозволяємо schema.org, w3.org (namespace)
        if (m.includes("schema.org") || m.includes("w3.org") || m.includes("sitemaps.org")) continue;
        console.log(`  ❌ ${rel} — сторонній origin: ${m}`);
        extErrors++;
        totalErrors++;
      }
    }
  }
  if (extErrors === 0) {
    console.log("  ✅ Сторонніх origin немає (окрім namespace)");
  }
} else {
  console.log("  ⚠️  dist/ не існує. Пропущено.");
}
console.log("");

// 5. HTML-перевірки
console.log("--- 5. HTML: h1, alt, href, lang ---");
if (existsSync(distDir)) {
  const htmlFiles = walkDir(distDir).filter((f) => f.endsWith(".html"));
  let htmlErrors = 0;
  for (const file of htmlFiles) {
    const content = readFileSync(file, "utf-8");
    const rel = file.replace(distDir + "/", "");

    // Один h1
    const h1Count = (content.match(/<h1[\s>]/g) || []).length;
    if (h1Count > 1) {
      console.log(`  ❌ ${rel} — ${h1Count} тегів h1 (має бути 1)`);
      htmlErrors++;
      totalErrors++;
    }

    // alt на img
    const imgTags = content.match(/<img[^>]*>/g) || [];
    for (const img of imgTags) {
      if (!/alt=/.test(img)) {
        console.log(`  ❌ ${rel} — <img> без alt`);
        htmlErrors++;
        totalErrors++;
      }
    }

    // Порожні href
    if (/href=["']#["']/.test(content) || /href=["']["']/.test(content)) {
      console.log(`  ❌ ${rel} — порожній href`);
      htmlErrors++;
      totalErrors++;
    }

    // lang
    if (!/<html[^>]*lang=/.test(content)) {
      console.log(`  ❌ ${rel} — <html> без lang`);
      htmlErrors++;
      totalErrors++;
    }
  }
  if (htmlErrors === 0) {
    console.log(`  ✅ ${htmlFiles.length} HTML-файлів: h1, alt, href, lang — чисто`);
  }
} else {
  console.log("  ⚠️  dist/ не існує. Пропущено.");
}
console.log("");

// 6. Дублі entry
console.log("--- 6. Дублі entry ---");
const contentDir = resolve("content");
if (existsSync(contentDir)) {
  const mdFiles = walkDir(contentDir).filter((f) => f.endsWith(".md"));
  const entries = new Map();
  let entryErrors = 0;
  for (const file of mdFiles) {
    const content = readFileSync(file, "utf-8");
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!fmMatch) continue;
    const entryMatch = fmMatch[1].match(/^entry:\s*(\d+)/m);
    if (entryMatch) {
      const entry = parseInt(entryMatch[1], 10);
      const rel = file.replace(contentDir + "/", "");
      if (entries.has(entry)) {
        console.log(`  ❌ entry ${entry}: дублікат (${entries.get(entry)} і ${rel})`);
        entryErrors++;
        totalErrors++;
      } else {
        entries.set(entry, rel);
      }
    }
  }
  if (entryErrors === 0 && entries.size > 0) {
    console.log(`  ✅ ${entries.size} унікальних entry`);
  } else if (entries.size === 0) {
    console.log("  ⚠️  entry не знайдено. Пропущено.");
  }
} else {
  console.log("  ⚠️  content/ не існує. Пропущено.");
}
console.log("");

// 7. Глибина DOM
console.log("--- 7. Глибина DOM ---");
if (existsSync(distDir)) {
  const htmlFiles = walkDir(distDir).filter((f) => f.endsWith(".html"));
  let depthErrors = 0;
  for (const file of htmlFiles) {
    const content = readFileSync(file, "utf-8");
    const rel = file.replace(distDir + "/", "");
    let depth = 0;
    let maxDepth = 0;
    const tagRegex = /<(\/?)([a-z][a-z0-9]*)[^>]*>/gi;
    const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
    let m;
    while ((m = tagRegex.exec(content)) !== null) {
      const isClosing = m[1] === "/";
      const tag = m[2].toLowerCase();
      if (voidTags.has(tag)) continue;
      if (!isClosing) {
        depth++;
        if (depth > maxDepth) maxDepth = depth;
      } else {
        depth--;
      }
    }
    if (maxDepth > 15) {
      console.log(`  ❌ ${rel} — глибина ${maxDepth} (поріг 15)`);
      depthErrors++;
      totalWarnings++;
    }
  }
  if (depthErrors === 0) {
    console.log("  ✅ Глибина DOM ≤ 15");
  }
} else {
  console.log("  ⚠️  dist/ не існує. Пропущено.");
}
console.log("");

// 7а. Нуль JS — DECISIONS.md §40, TECH_STANDARDS §5
console.log("--- 7а. Нуль JS ---");
if (existsSync(distDir)) {
  let jsErrors = 0;

  // .js файли
  const jsFiles = walkDir(distDir).filter((f) => f.endsWith(".js"));
  for (const file of jsFiles) {
    const rel = file.replace(distDir + "/", "");
    console.log(`  ❌ ${rel} — .js файл у dist/`);
    jsErrors++;
    totalErrors++;
  }

  // <script>, on*= обробники, javascript: у HTML
  const htmlFiles = walkDir(distDir).filter((f) => f.endsWith(".html"));
  for (const file of htmlFiles) {
    const content = readFileSync(file, "utf-8");
    const rel = file.replace(distDir + "/", "");
    const patterns = [
      { re: /<script\b/gi, name: "<script> тег" },
      { re: /\son[a-z]+\s*=\s*["']/gi, name: "on* обробник" },
      { re: /href\s*=\s*["']javascript:/gi, name: "javascript: href" },
    ];
    for (const { re, name } of patterns) {
      const m = content.match(re);
      if (m) {
        console.log(`  ❌ ${rel} — ${name} (${m.length} знайдено)`);
        jsErrors++;
        totalErrors++;
      }
    }
  }

  if (jsErrors === 0) {
    console.log(`  ✅ JS: 0 байт (${htmlFiles.length} HTML, ${jsFiles.length} .js файлів)`);
  }
} else {
  console.log("  ⚠️  dist/ не існує. Пропущено.");
}
console.log("");

// 7б. Шрифти — DECISIONS.md §41, TECH_STANDARDS §6
console.log("--- 7б. Шрифти ---");
const fontsDir = resolve("static/fonts");
if (existsSync(fontsDir)) {
  let fontErrors = 0;
  const woff2 = walkDir(fontsDir).filter((f) => f.endsWith(".woff2"));

  // 1. Один файл
  if (woff2.length > 1) {
    console.log(`  ❌ ${woff2.length} .woff2 файлів (бюджет: 1)`);
    fontErrors++;
    totalErrors++;
  } else if (woff2.length === 1) {
    // 2. Вага ≤ 60 КБ
    const sizeKB = statSync(woff2[0]).size / 1024;
    if (sizeKB > 60) {
      console.log(`  ❌ ${woff2[0].replace(fontsDir + "/", "")}: ${sizeKB.toFixed(1)} КБ (бюджет 60 КБ)`);
      fontErrors++;
      totalErrors++;
    } else {
      console.log(`  ✅ 1 .woff2: ${sizeKB.toFixed(1)} КБ (бюджет 60 КБ)`);
    }
  } else {
    console.log("  ⚠️  .woff2 не знайдено. Пропущено.");
  }

  // 3. font-display: optional у CSS-файлах
  if (existsSync(stylesDir)) {
    const cssFiles = walkDir(stylesDir).filter((f) => f.endsWith(".css"));
    let displayErrors = 0;
    for (const file of cssFiles) {
      const content = readFileSync(file, "utf-8");
      const faces = content.match(/@font-face\s*{[^}]*}/gi) || [];
      for (const face of faces) {
        if (!/font-display\s*:\s*optional/i.test(face)) {
          const rel = file.replace(stylesDir + "/", "");
          console.log(`  ❌ ${rel} — @font-face без font-display: optional`);
          displayErrors++;
          totalErrors++;
        }
      }
    }
    if (displayErrors === 0 && faces0Exists(stylesDir)) {
      console.log("  ✅ font-display: optional у всіх @font-face");
    }
  }

  // 4. Сторонні шрифтові origin у CSS
  if (existsSync(stylesDir)) {
    const cssFiles = walkDir(stylesDir).filter((f) => f.endsWith(".css"));
    const fontOriginRegex = /https?:\/\/(?!koztechie\.fyi|localhost)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^"')\s]*\.(woff2?|ttf|otf)/gi;
    let originErrors = 0;
    for (const file of cssFiles) {
      const content = readFileSync(file, "utf-8");
      if (content.match(fontOriginRegex)) {
        const rel = file.replace(stylesDir + "/", "");
        console.log(`  ❌ ${rel} — сторонній шрифтовий origin`);
        originErrors++;
        totalErrors++;
      }
    }
    if (originErrors === 0) {
      console.log("  ✅ Без сторонніх шрифтових origin");
    }
  }
} else {
  console.log("  ⚠️  static/fonts/ не існує. Пропущено.");
}
console.log("");

// Допоміжна: чи є хоча б один @font-face у стилях
function faces0Exists(dir) {
  try {
    return walkDir(dir)
      .filter((f) => f.endsWith(".css"))
      .some((f) => /@font-face/i.test(readFileSync(f, "utf-8")));
  } catch {
    return false;
  }
}

// Підсумок
console.log("=== ПІДСУМОК ===");
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

// Допоміжна функція
function walkDir(dir) {
  const results = [];
  try {
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
  } catch {
    // Тека не існує або недоступна
  }
  return results;
}
