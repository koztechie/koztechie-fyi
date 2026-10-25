#!/usr/bin/env node
// check.mjs: автономний чекліст ВУЗОЛ-0 (без залежностей)
// Перевіряє: бюджети, CSS-патерни, hex, сторонні origin, head, UI-хардкод, h1, alt, href, lang, entry.
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
  { pattern: /conic-gradient/gi, name: "conic-gradient" },
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

// 7г. Ліцензії — PLAN.md 61
console.log("--- 7г. Ліцензійні файли ---");
const rootDir = resolve(".");
let licenseErrors = 0;

const licenseFile = join(rootDir, "LICENSE");
if (!existsSync(licenseFile)) {
  console.log("  ❌ LICENSE відсутній (ISC для коду)");
  licenseErrors++;
  totalErrors++;
} else {
  const lc = readFileSync(licenseFile, "utf-8");
  if (!/ISC/i.test(lc)) {
    console.log("  ❌ LICENSE без згадки ISC");
    licenseErrors++;
    totalErrors++;
  } else {
    console.log("  ✅ LICENSE: ISC");
  }
}

const copyrightFile = join(rootDir, "COPYRIGHT");
if (!existsSync(copyrightFile)) {
  console.log("  ❌ COPYRIGHT відсутній (© для контенту)");
  licenseErrors++;
  totalErrors++;
} else {
  const cc = readFileSync(copyrightFile, "utf-8");
  if (!/усі права застережено/i.test(cc)) {
    console.log("  ❌ COPYRIGHT без формули «Усі права застережено»");
    licenseErrors++;
    totalErrors++;
  } else {
    console.log("  ✅ COPYRIGHT: усі права застережено");
  }
}

// Перехресне посилання: LICENSE має відсилати до COPYRIGHT
if (existsSync(licenseFile) && existsSync(copyrightFile)) {
  if (!/COPYRIGHT/.test(readFileSync(licenseFile, "utf-8"))) {
    console.log("  ❌ LICENSE не посилається на COPYRIGHT");
    licenseErrors++;
    totalErrors++;
  } else {
    console.log("  ✅ LICENSE → COPYRIGHT (перехресне посилання)");
  }
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

// 7д. Політика залежностей — AGENTS.md §3, DECISIONS.md §38.4
console.log("--- 7д. Політика залежностей ---");
const pkgPath = join(resolve("."), "package.json");
if (!existsSync(pkgPath)) {
  console.log("  ⚠️  package.json не існує. Пропущено (скелет: крок 69).");
} else {
  let depErrors = 0;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  const deps = Object.keys(pkg.dependencies || {});
  const devDeps = Object.keys(pkg.devDependencies || {});

  // Єдиний дозволений пакет
  const allowed = new Set(["@11ty/eleventy"]);
  for (const dep of [...deps, ...devDeps]) {
    if (!allowed.has(dep)) {
      console.log(`  ❌ Недозволена залежність: ${dep} (потрібен [ДОЗВОЛЕНО NPM])`);
      depErrors++;
      totalErrors++;
    }
  }

  // Точна версія без ^ ~ >= *
  const versionMap = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  for (const [name, range] of Object.entries(versionMap)) {
    if (/[\^~>=*]|\s-\s|latest|next/.test(range)) {
      console.log(`  ❌ ${name}: «${range}» — версія має бути точною (без ^ ~ >=)`);
      depErrors++;
      totalErrors++;
    }
  }

  // devDependencies мають бути порожніми (скрипти автономні)
  if (devDeps.length > 0) {
    console.log(`  ❌ devDependencies не порожні: ${devDeps.join(", ")}`);
    depErrors++;
    totalErrors++;
  }

  // package-lock.json обов'язковий при наявності package.json
  if (!existsSync(join(resolve("."), "package-lock.json"))) {
    console.log("  ❌ package-lock.json відсутній (TECH_STANDARDS §2)");
    depErrors++;
    totalErrors++;
  }

  if (depErrors === 0) {
    console.log(`  ✅ Залежності: ${deps.length} (${deps.join(", ") || "немає"}), точні версії, lock на місці`);
  }
}
console.log("");

// 7е. Узгодженість версії Node — TECH_STANDARDS §2, package.json engines
console.log("--- 7е. Версія Node ---");
let nodeErrors = 0;
const nvmrcPath = join(resolve("."), ".nvmrc");
if (!existsSync(nvmrcPath)) {
  console.log("  ❌ .nvmrc відсутній (TECH_STANDARDS §2)");
  nodeErrors++;
  totalErrors++;
} else {
  const nvmVersion = readFileSync(nvmrcPath, "utf-8").trim();
  const nvmMajor = parseInt(nvmVersion, 10);

  // Поточна версія
  const currentMajor = parseInt(process.version.slice(1), 10);
  if (!isNaN(nvmMajor) && currentMajor !== nvmMajor) {
    console.log(`  ❌ .nvmrc: ${nvmVersion}, поточна Node: ${process.version.slice(1)}`);
    nodeErrors++;
    totalErrors++;
  }

  // .nvmrc ↔ engines.node
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    const enginesRange = pkg.engines?.node || "";
    const enginesMajor = enginesRange.match(/(\d+)/);
    if (enginesMajor && nvmMajor !== parseInt(enginesMajor[1], 10)) {
      console.log(`  ❌ .nvmrc: ${nvmMajor}, engines.node: «${enginesRange}»`);
      nodeErrors++;
      totalErrors++;
    }
  }

  if (nodeErrors === 0) {
    console.log(`  ✅ .nvmrc: ${nvmVersion} = поточна Node = engines.node`);
  }
}
console.log("");

// 7ж. Head: сторонні ресурси — TECH_STANDARDS §8, DECISIONS.md §36.1
console.log("--- 7ж. Head: сторонні ресурси ---");
if (existsSync(distDir)) {
  let headErrors = 0;
  const headHtmlFiles = walkDir(distDir).filter((f) => f.endsWith(".html"));

  // Теги, заборонені у head (взаємодія з мережею та документом)
  const forbiddenInHead = [
    { re: /<link\b[^>]*rel\s*=\s*["']?(preconnect|dns-prefetch|prefetch|preload)\b[^>]*>/gi, name: "link rel=preconnect/dns-prefetch/prefetch/preload" },
    { re: /<meta\b[^>]*http-equiv\s*=\s*["']?refresh\b[^>]*>/gi, name: "meta http-equiv=refresh" },
    { re: /<base\b/gi, name: "<base> тег" },
    { re: /<(iframe|embed|object|applet)\b/gi, name: "<iframe/embed/object/applet> у head" },
    { re: /<script\b/gi, name: "<script> тег" },
    // Protocol-relative: //cdn... (без схеми — обходить https?-перевірку розділу 4)
    { re: /(?:href|src)\s*=\s*["']\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, name: "protocol-relative URL (//)" },
    // @import у style-тегах head
    { re: /<style\b[^>]*>[\s\S]*?@import[\s\S]*?<\/style>/gi, name: "@import у <style>" },
  ];

  for (const file of headHtmlFiles) {
    const content = readFileSync(file, "utf-8");
    const rel = file.replace(distDir + "/", "");

    // Виділяємо head (включно з тегами)
    const headMatch = content.match(/<head\b[^>]*>[\s\S]*?<\/head>/i);
    if (!headMatch) continue;
    const head = headMatch[0];

    for (const { re, name } of forbiddenInHead) {
      const matches = head.match(re);
      if (matches) {
        console.log(`  ❌ ${rel} — ${name} (${matches.length} знайдено)`);
        headErrors++;
        totalErrors++;
      }
    }

    // Будь-який <link href> на сторонній origin у head
    const linkMatches = head.match(/<link\b[^>]*href\s*=\s*["']https?:\/\/(?!koztechie\.fyi|localhost|127\.0\.0\.1)[^"']+["'][^>]*>/gi);
    if (linkMatches) {
      console.log(`  ❌ ${rel} — <link> на сторонній origin (${linkMatches.length} знайдено)`);
      headErrors++;
      totalErrors++;
    }
  }

  if (headErrors === 0) {
    console.log(`  ✅ Head чистий: ${headHtmlFiles.length} HTML, заборонених тегів немає`);
  }
} else {
  console.log("  ⚠️  dist/ не існує. Пропущено.");
}
console.log("");

// 7з. UI без хардкоду — крок 118. Значення словників не мають бути
// в розмітці шаблонів (поза коментарями). Джерело істини — самі словники:
// оновив JSON, ти автоматично оновив правило.
console.log("--- 7з. UI без хардкоду ---");
{
  const stringsDir = resolve("src/_data/strings");
  const templatesDir = resolve("src/templates");
  let hardcodeErrors = 0;

  const collectValues = (obj, out = []) => {
    for (const v of Object.values(obj)) {
      if (typeof v === "string") out.push(v);
      else if (Array.isArray(v)) v.forEach((x) => typeof x === "string" && out.push(x));
      else if (v && typeof v === "object") collectValues(v, out);
    }
    return out;
  };

  if (existsSync(stringsDir) && existsSync(templatesDir)) {
    // Значення з літерами, довжиною ≥ 3 — односимвольні та цифри не рахуємо
    const forbidden = [];
    for (const f of ["uk.json", "en.json"]) {
      const p = join(stringsDir, f);
      if (!existsSync(p)) continue;
      try {
        const data = JSON.parse(readFileSync(p, "utf-8"));
        for (const val of collectValues(data)) {
          if (val.length >= 3 && /\p{L}/u.test(val)) forbidden.push({ val, src: f });
        }
      } catch {
        console.log(`  ❌ ${f} — не JSON`);
        totalErrors++;
      }
    }

    const tplFiles = walkDir(templatesDir).filter((f) => f.endsWith(".njk"));
    const seen = new Set();
    for (const file of tplFiles) {
      let text = readFileSync(file, "utf-8");
      // Прибираємо коментарі (документують правила, не розмітка) та вирази njk
      // ({{ strings.* }}, {% set %}) — хардкодом є лише статичний текст і атрибути.
      text = text.replace(/\{#[\s\S]*?#\}/g, "");
      text = text.replace(/\{\{[\s\S]*?\}\}/g, " ");
      text = text.replace(/\{%[\s\S]*?%\}/g, " ");
      const rel = file.replace(templatesDir + "/", "");

      // Фаза A: статичний текст між тегами — шукати значення як підрядок,
      // а також перше «велике» слово (ловить «Зроблено в Києві вручну»).
      const textNodes = [...text.matchAll(/>([^<>]+)</g)].map((m) => m[1]).join("\n");
      // Фаза B: LIШЕ текстові атрибути (aria-label, alt, title, placeholder) —
      // точний збіг. class="entry" — CSS-клас, не UI-текст, не перевіряється.
      const attrValues = [...text.matchAll(/\b(?:aria-label|alt|title|placeholder)\s*=\s*(["'])([^"']+)\1/g)].map(
        (m) => m[2]
      );

      for (const { val, src } of forbidden) {
        const key = rel + "\u0000" + val;
        if (seen.has(key)) continue;
        const firstWord = val.split(/\s+/)[0];
        const hit =
          textNodes.includes(val) ||
          (firstWord.length >= 4 && textNodes.includes(firstWord)) ||
          attrValues.includes(val);
        if (hit) {
          const why = textNodes.includes(val) ? "текст" : attrValues.includes(val) ? "атрибут" : "перше слово";
          console.log(`  ❌ ${rel} — хардкод «${val}» (${why}, зі словника ${src})`);
          seen.add(key);
          hardcodeErrors++;
          totalErrors++;
        }
      }
    }

    if (hardcodeErrors === 0) {
      console.log(`  ✅ Хардкоду немає: ${tplFiles.length} шаблонів, ${forbidden.length} значень у словниках під контролем`);
    }

    // Парність структури uk ↔ en (крок 119): ключ, забутий в одній мові,
    // мовчки зламає переклад. Однакова структура — однакові шляхи доступу.
    const loadObj = (name) => {
      const p = join(stringsDir, name);
      if (!existsSync(p)) return null;
      try {
        return JSON.parse(readFileSync(p, "utf-8"));
      } catch {
        return null;
      }
    };
    const keysOf = (obj, prefix = "") => {
      const out = [];
      for (const [k, v] of Object.entries(obj || {})) {
        if (Array.isArray(v)) out.push(prefix + k + "[]");
        else if (v && typeof v === "object") out.push(...keysOf(v, prefix + k + "."));
        else out.push(prefix + k);
      }
      return out.sort();
    };
    const ukObj = loadObj("uk.json");
    const enObj = loadObj("en.json");
    if (ukObj && enObj) {
      const ku = keysOf(ukObj);
      const ke = keysOf(enObj);
      const onlyUk = ku.filter((k) => !ke.includes(k));
      const onlyEn = ke.filter((k) => !ku.includes(k));
      if (onlyUk.length || onlyEn.length) {
        for (const k of onlyUk) console.log(`  ❌ Ключ лише в uk.json: ${k}`);
        for (const k of onlyEn) console.log(`  ❌ Ключ лише в en.json: ${k}`);
        totalErrors += onlyUk.length + onlyEn.length;
      } else {
        console.log(`  ✅ Парність ключів uk ↔ en: ${ku.length}/${ke.length}`);
      }
    }
  } else {
    console.log("  ⚠️  src/_data/strings або src/templates не існують. Пропущено.");
  }
}
console.log("");

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
