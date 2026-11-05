#!/usr/bin/env node
// check.mjs: автономний чекліст ВУЗОЛ-0 (без залежностей)
// Перевіряє: бюджети, CSS-патерни, hex, сторонні origin, head, UI-хардкод, h1, alt, href, lang, entry, ШІ-політику, RSS-фіди, лінки, перемикач мов, таб-навігацію, skip-link, JSON-LD, canonical.
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

// JSON-LD (type=application/ld+json) — специфікація Schema.org, не виконуваний
// JavaScript. Дозволений TECH_STANDARDS §9 (крок 151). Прибирається перед
// перевірками JS: 7а (скрипти) та 7ж (head).
function stripJsonLd(html) {
  return html.replace(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "");
}

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

  // 1d. Passthrough: ассети мають бути ПО правильних шляхах (розмітка шукає
  // /styles/, /fonts/). Простий passthrough з input="." кладе їх у dist/src/...,
  // dist/static/... — і сайт рендериться без стилів (виявлено при перегляді).
  const requiredAssets = [
    ...["core", "layout", "components", "themes", "print"].map((n) => `styles/${n}.css`),
    "fonts/IBMPlexMono-Regular-subset.woff2",
  ];
  let assetErrors = 0;
  for (const rel of requiredAssets) {
    if (!existsSync(join(distDir, rel))) {
      console.log(`  ❌ dist/${rel} відсутній (passthrough? розмітка шукає /${rel})`);
      assetErrors++;
      totalErrors++;
    }
  }
  if (assetErrors === 0) {
    console.log(`  ✅ Ассети на місці: 5 CSS + 1 woff2 (${requiredAssets.length} шляхів)`);
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

  // Рем-відступи: кратність 0.25rem (design-system §6.5, аудит 2026-10-26).
  // em — типографіка (прив'язана до кегля/гліфа), clamp — плавна ритміка:
  // обидва класи поза рем-сіткою за каноном.
  let gridErrors = 0;
  for (const file of cssFiles) {
    const content = readFileSync(file, "utf-8");
    const rel = file.replace(stylesDir + "/", "");
    const spacingRe = /(?:margin|padding|gap)(?:-[a-z]+)?\s*:\s*([^;]+);/gi;
    let sm;
    while ((sm = spacingRe.exec(content)) !== null) {
      for (const token of sm[1].split(/[\s,]+/)) {
        const mm = token.match(/^(-?[\d.]+)rem$/);
        if (!mm) continue;
        const n = parseFloat(mm[1]);
        if (Math.abs(n / 0.25 - Math.round(n / 0.25)) > 1e-9) {
          const line = content.slice(0, sm.index).split("\n").length;
          console.log(`  ❌ ${rel}:${line} — відступ ${token} поза сіткою 0.25rem (design-system §6.5)`);
          gridErrors++;
          totalErrors++;
        }
      }
    }
  }
  if (gridErrors === 0) {
    console.log("  ✅ Сітка відступів: усі рем-відступи кратні 0.25 (§6.5)");
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
        // Дозволяємо schema.org, w3.org, sitemaps.org (namespace)
        // та github.com (§277 — єдине посилання коду, /colophon/),
        // play.google.com (§290 — магазин застосунку NICHLYST).
        if (m.includes("schema.org") || m.includes("w3.org") || m.includes("sitemaps.org")) continue;
        if (m.includes("github.com")) continue;
        if (m.includes("play.google.com")) continue; // §290 — магазин NICHLYST
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

    // Один h1: рівно один (канон — і відсутність, і дубль це порушення)
    const h1Count = (content.match(/<h1[\s>]/g) || []).length;
    if (h1Count !== 1) {
      console.log(`  ❌ ${rel} — ${h1Count} тегів h1 (має бути рівно 1)`);
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
      // Переклад зберігає той самий entry (design-system §7.1.1,
      // content-model §6: однаковий slug для uk та en).
      // Нормалізація: uk/blog/x.md і en/blog/x.md → blog/x.md.
      const normalized = rel.replace(/^(uk|en)\//, "");
      if (entries.has(entry)) {
        const prev = entries.get(entry);
        if (prev.normalized === normalized && prev.rel !== rel) {
          // Це переклад, не дублікат — пропускаємо мовчазно.
          continue;
        }
        console.log(`  ❌ entry ${entry}: дублікат (${prev.rel} і ${rel})`);
        entryErrors++;
        totalErrors++;
      } else {
        entries.set(entry, { rel, normalized });
      }
    }
  }
  if (entryErrors === 0 && entries.size > 0) {
    console.log(`  ✅ ${entries.size} унікальних entry (переклади не рахуються)`);
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
  // JSON-LD (type=application/ld+json) — не виконуваний контент, дозволений
  // TECH_STANDARDS §9 (крок 151) — прибираємо перед перевіркою JS.
  const htmlFiles = walkDir(distDir).filter((f) => f.endsWith(".html"));
  for (const file of htmlFiles) {
    const content = stripJsonLd(readFileSync(file, "utf-8"));
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
    // JSON-LD прибрано: дозволений TECH_STANDARDS §9, не JS (крок 151)
    const content = stripJsonLd(readFileSync(file, "utf-8"));
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
  const srcDir = resolve("src"); // sitemap.njk, styles.njk лежать поза templates/ (ARCHITECTURE)
  let hardcodeErrors = 0;

  const collectValues = (obj, out = []) => {
    for (const v of Object.values(obj)) {
      if (typeof v === "string") out.push(v);
      // Масиви: рядки напряму, об'єкти — рекурсією (напр. principles: [{title,text}]).
      else if (Array.isArray(v))
        v.forEach((x) => {
          if (typeof x === "string") out.push(x);
          else if (x && typeof x === "object") collectValues(x, out);
        });
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

    const tplFiles = walkDir(srcDir).filter((f) => f.endsWith(".njk"));
    const seen = new Set();
    for (const file of tplFiles) {
      let text = readFileSync(file, "utf-8");
      // Прибираємо коментарі (документують правила, не розмітка) та вирази njk
      // ({{ strings.* }}, {% set %}) — хардкодом є лише статичний текст і атрибути.
      text = text.replace(/\{#[\s\S]*?#\}/g, "");
      text = text.replace(/\{\{[\s\S]*?\}\}/g, " ");
      text = text.replace(/\{%[\s\S]*?%\}/g, " ");
      const rel = file.replace(srcDir + "/", "");

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
        // Межа першого слова — юнікод-літери, не \b (кирилиця поза \w, а
        // «WebSite» не має межі перед «Site» — хибне спрацювання, крок 2026-11-05).
        const esc = firstWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const wordRe = new RegExp(`(^|[^\\p{L}])${esc}([^\\p{L}]|$)`, "u");
        const hit =
          textNodes.includes(val) ||
          (firstWord.length >= 4 && wordRe.test(textNodes)) ||
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

// 7и. robots.txt і _headers: політика ШІ-краулерів — PLAN 122, 313.
console.log("--- 7и. robots.txt і _headers ---");
{
  let policyErrors = 0;
  const rootDir = resolve("static/root");
  const robotsPath = join(rootDir, "robots.txt");
  const headersPath = join(rootDir, "_headers");

  if (!existsSync(robotsPath)) {
    console.log("  ❌ static/root/robots.txt відсутній");
    policyErrors++;
    totalErrors++;
  } else {
    const robots = readFileSync(robotsPath, "utf-8");
    // Посилання на sitemap (крок 121)
    if (!/Sitemap:\s*https:\/\/koztechie\.fyi\/sitemap\.xml/.test(robots)) {
      console.log("  ❌ robots.txt: немає Sitemap: https://koztechie.fyi/sitemap.xml");
      policyErrors++;
      totalErrors++;
    }
    // ШІ-політика: бот + заборона поезії та авторських текстів
    const aiBots = /User-agent:\s*(GPTBot|ClaudeBot|CCBot|Google-Extended|Bytespider|PerplexityBot)/.test(robots);
    if (!aiBots) {
      console.log("  ❌ robots.txt: немає ШІ-краулерів (GPTBot/ClaudeBot/CCBot/...)");
      policyErrors++;
      totalErrors++;
    }
    const disallows = ["/poetry/", "/blog/", "/en/poetry/", "/en/blog/"];
    for (const d of disallows) {
      if (!robots.includes(`Disallow: ${d}`)) {
        console.log(`  ❌ robots.txt: немає «Disallow: ${d}»`);
        policyErrors++;
        totalErrors++;
      }
    }
  }

  if (!existsSync(headersPath)) {
    console.log("  ❌ static/root/_headers відсутній (примусова заборона, PLAN 122)");
    policyErrors++;
    totalErrors++;
  } else {
    const headers = readFileSync(headersPath, "utf-8");
    if (!headers.includes("X-Robots-Tag: noai")) {
      console.log("  ❌ _headers: немає X-Robots-Tag: noai");
      policyErrors++;
      totalErrors++;
    }
    // Примус тих самих шляхів, що й robots.txt
    for (const p of ["/poetry/*", "/blog/*", "/en/poetry/*", "/en/blog/*"]) {
      if (!headers.includes(p)) {
        console.log(`  ❌ _headers: немає секції ${p}`);
        policyErrors++;
        totalErrors++;
      }
    }
  }

  if (policyErrors === 0) {
    console.log("  ✅ Політика ШІ: robots.txt (16 ботів, 4 Disallow, Sitemap) + _headers (X-Robots-Tag ×4)");
  }
}
console.log("");

// 7і. RSS фіди — крок 126. Валідація за DECISIONS.md §30 (RSS 2.0, повні тексти).
console.log("--- 7і. RSS фіди ---");
{
  const feedErrors = (msg) => {
    console.log(`  ❌ ${msg}`);
    totalErrors++;
  };
  const RFC822 = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (0[1-9]|[12][0-9]|3[01]) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/;
  const FORBIDDEN = [/читати далі/i, /read more/i, /continue reading/i, /utm_/i, /поділіться/i, /підпишіться/i, /share this/i];

  if (!existsSync(distDir)) {
    console.log("  ⚠️  dist/ не існує. Пропущено (спочатку npm run build).");
  } else {
    const startErrors = totalErrors;
    let totalItems = 0;
    const feeds = [
      { path: join(distDir, "feed.xml"), lang: "uk", root: "https://koztechie.fyi/" },
      { path: join(distDir, "en", "feed.xml"), lang: "en", root: "https://koztechie.fyi/en/" },
    ];

    for (const feed of feeds) {
      const label = feed.lang === "uk" ? "/feed.xml" : "/en/feed.xml";
      if (!existsSync(feed.path)) {
        feedErrors(`${label}: файл відсутній після збірки`);
        continue;
      }
      const xml = readFileSync(feed.path, "utf-8");

      // XML-каркас RSS 2.0
      if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) feedErrors(`${label}: немає XML-декларації UTF-8`);
      if (!/<rss\b[^>]*\bversion="2\.0"/.test(xml)) feedErrors(`${label}: немає <rss version="2.0">`);
      if ((xml.match(/<rss\b/g) || []).length !== (xml.match(/<\/rss>/g) || []).length) feedErrors(`${label} незбалансований <rss>`);
      if ((xml.match(/<channel>/g) || []).length !== (xml.match(/<\/channel>/g) || []).length) feedErrors(`${label} незбалансований <channel>`);
      const openItems = (xml.match(/<item>/g) || []).length;
      const closeItems = (xml.match(/<\/item>/g) || []).length;
      if (openItems !== closeItems) feedErrors(`${label}: незбалансовані <item> (${openItems} ≠ ${closeItems})`);
      if ((xml.match(/<!\[CDATA\[/g) || []).length !== (xml.match(/\]\]>/g) || []).length) feedErrors(`${label} незакритий CDATA`);

      // Канал: обов'язкові за §17.3
      const channel = xml.match(/<channel>([\s\S]*?)<\/channel>/)?.[1] || "";
      const channelItem = channel.indexOf("<item>");
      const channelHead = channelItem >= 0 ? channel.slice(0, channelItem) : channel;
      if (!/<title>[^\s<][\s\S]*?<\/title>/.test(channelHead)) feedErrors(`${label}: канал без <title>`);
      if (!/<link>https:\/\/koztechie\.fyi[^<]*<\/link>/.test(channelHead)) feedErrors(`${label}: канал без <link>`);
      if (!/<description>[^\s<][\s\S]*?<\/description>/.test(channelHead)) feedErrors(`${label}: канал без <description>`);
      if (!new RegExp(`<language>${feed.lang}<\\/language>`).test(channelHead)) feedErrors(`${label}: <language> ≠ ${feed.lang}`);
      const chanLink = channelHead.match(/<link>([^<]*)<\/link>/)?.[1];
      if (chanLink !== feed.root) feedErrors(`${label}: link каналу «${chanLink}» ≠ «${feed.root}»`);

      // Items (§30.4)
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
      totalItems += items.length;
      if (items.length === 0) console.log(`  ⚠️  ${label}: 0 записів (контент ще не створено)`);

      const guids = new Set();
      for (const [i, it] of items.entries()) {
        const n = `item ${i + 1} (${label})`;
        const title = it.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
        const link = it.match(/<link>([^<]*)<\/link>/)?.[1];
        const guid = it.match(/<guid[^>]*>([^<]*)<\/guid>/)?.[1];
        const pub = it.match(/<pubDate>([^<]*)<\/pubDate>/)?.[1];
        const desc = it.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.trim();

        if (!title) feedErrors(`${n}: без <title>`);
        if (!link) feedErrors(`${n}: без <link>`);
        if (!desc) feedErrors(`${n}: без <description>`);
        else if (desc.length < 10) feedErrors(`${n}: description занадто короткий — повний текст? (§30.1)`);

        // guid = link, абсолютний (§30.4)
        if (!guid) feedErrors(`${n}: без <guid>`);
        else {
          if (guid !== link) feedErrors(`${n}: guid ≠ link (§30.4)`);
          if (!/^https:\/\/koztechie\.fyi\//.test(guid)) feedErrors(`${n}: guid не абсолютний https://koztechie.fyi`);
          if (guids.has(guid)) feedErrors(`${n}: дублікат guid «${guid}»`);
          guids.add(guid);
        }

        // pubDate RFC 822 (§30.4)
        if (!pub) feedErrors(`${n}: без <pubDate>`);
        else if (!RFC822.test(pub.trim())) feedErrors(`${n}: pubDate не RFC 822: «${pub}»`);

        // Абсолютний лінк на сайт
        if (link && !/^https:\/\/koztechie\.fyi\//.test(link)) feedErrors(`${n}: link не абсолютний: «${link}»`);

        // Заборони §30.3
        const whole = (title || "") + " " + (desc || "");
        for (const re of FORBIDDEN) {
          if (re.test(whole)) feedErrors(`${n}: заборонено за §30.3 — знайдено «${re.source}»`);
        }
      }
    }

    if (totalErrors === startErrors) {
      console.log(`  ✅ Фіди валідні: 2 канали (uk/en), ${totalItems} записів, §30.1–30.4 дотримано`);
    }
  }
}
console.log("");

// 7к. Linkcheck — крок 132. Нуль битих лінків (scripts/linkcheck.mjs).
console.log("--- 7к. Лінки ---");
{
  const { runLinkcheck } = await import("./linkcheck.mjs");
  const { checked, errors } = runLinkcheck(distDir);
  for (const e of errors) {
    console.log(`  ❌ ${e}`);
    totalErrors++;
  }
  if (errors.length === 0) {
    console.log(`  ✅ ${checked} лінків: нуль битих (внутрішні, якорі, sitemap, RSS)`);
  }
}
console.log("");

// 7л. Перемикач мов — крок 133. design-system.md §8.1, DECISIONS.md §19.5.
// Кожна сторінка: .lang-switch, один span.current відповідної мови,
// лінк іншої мови (hreflang ≠ мові сторінки) на існуючу ціль,
// розділювач aria-hidden, УКР завжди перша (§8.1.1), aria-label.
console.log("--- 7л. Перемикач мов ---");
{
  const { resolveInternal } = await import("./linkcheck.mjs");
  let swErrors = 0;

  if (!existsSync(distDir)) {
    console.log("  ⚠️  dist/ не існує. Пропущено.");
  } else {
    const htmlFiles = walkDir(distDir).filter((f) => f.endsWith(".html"));
    const fail = (rel, msg) => {
      console.log(`  ❌ ${rel}: ${msg}`);
      swErrors++;
      totalErrors++;
    };

    for (const file of htmlFiles) {
      const rel = file.slice(distDir.length + 1);
      const doc = readFileSync(file, "utf-8");

      const nav = doc.match(/<nav class="lang-switch"([^>]*)>([\s\S]*?)<\/nav>/);
      if (!nav) {
        fail(rel, "немає <nav class=\"lang-switch\"> (§8.1.2)");
        continue;
      }
      const attrs = nav[1];
      const inner = nav[2];
      const pageLang = (doc.match(/<html[^>]*\blang="([^"]+)"/) || [])[1] || "uk";

      // aria-label на nav (доступність)
      if (!/aria-label="[^"]+"/.test(attrs)) fail(rel, " перемикач без aria-label");

      // Один поточний span (не лінк, §8.1)
      const currents = inner.match(/<span class="current"/g) || [];
      if (currents.length !== 1) {
        fail(rel, `span.current: ${currents.length} (має бути 1)`);
      } else {
        const curText = (inner.match(/<span class="current"[^>]*>([^<]*)<\/span>/) || [])[1]?.trim();
        const expect = pageLang === "en" ? "ENG" : "УКР";
        if (curText !== expect) fail(rel, `current «${curText}» ≠ мові сторінки ${pageLang} (очікується ${expect})`);
        // Поточна мова не є лінком
        if (new RegExp(`<a[^>]*>${expect}</a>`).test(inner)) fail(rel, `поточна мова «${expect}» — лінк, а не span (§8.1)`);
      }

      // Лінк іншої мови
      const other = inner.match(/<a\s+href="([^"]*)"\s+hreflang="(uk|en)"[^>]*>([^<]*)<\/a>/);
      if (!other) {
        fail(rel, "немає лінка іншої мови");
      } else {
        const [, href, hl, text] = other;
        if (hl === pageLang) fail(rel, `hreflang лінка «${hl}» збігається з мовою сторінки`);
        const expectText = pageLang === "en" ? "УКР" : "ENG";
        if (text.trim() !== expectText) fail(rel, `текст лінка «${text.trim()}» ≠ «${expectText}»`);
        if (!href.startsWith("/")) fail(rel, `лінк іншої мови не внутрішній: «${href}»`);
        else if (!resolveInternal(distDir, href)) fail(rel, `лінк іншої мови веде в нікуди: «${href}» (дзеркало або заглушка /en/, §19.5)`);
      }

      // Розділювач прихований від скрінрідерів
      if (!/aria-hidden="true"\s*>\s*<span|<span aria-hidden="true">\s*\//.test(inner) && !/<span aria-hidden="true">\/<\/span>/.test(inner)) {
        fail(rel, "розділювач «/» без aria-hidden (§8.1.2)");
      }

      // УКР завжди перша (§8.1.1)
      const ukr = inner.indexOf("УКР");
      const eng = inner.indexOf("ENG");
      if (ukr < 0 || eng < 0) fail(rel, "мітки УКР/ENG неповні");
      else if (ukr > eng) fail(rel, "ENG перед УКР (§8.1.1: УКР завжди перша)");
    }

    if (swErrors === 0) {
      console.log(`  ✅ Перемикач мов: ${htmlFiles.length} сторінок — current за мовою, лінки цілі, УКР перша`);
    }
  }
}
console.log("");

// 7м. Таб-навігація — крок 134. TECH_STANDARDS §9 (focus 2px accent ≥3:1),
// AGENTS.md §5 (видимий :focus, клавіатурна навігація).
console.log("--- 7м. Таб-навігація ---");
{
  let tbErrors = 0;
  const fail = (msg) => {
    console.log(`  ❌ ${msg}`);
    tbErrors++;
    totalErrors++;
  };

  // 1. Глобальний :focus-visible з 2px outline у CSS
  const cssFiles = walkDir(stylesDir).filter((f) => f.endsWith(".css"));
  const cssAll = cssFiles.map((f) => readFileSync(f, "utf-8")).join("\n");
  if (!/\.?[a-z-]*:focus-visible[^{]*\{[^}]*outline\s*:\s*2px\s+solid/.test(cssAll)) {
    fail("CSS: немає правила :focus-visible з outline 2px solid (TECH_STANDARDS §9)");
  }
  // 2. Ніхто не ховає фокус
  const hidden = cssAll.match(/outline\s*:\s*(none|0)\b/g);
  if (hidden) fail(`CSS: ховає фокус — ${hidden.join(" та ")} (AGENTS §5 забороняє)`);
  // 3. Focus-обідок не вимикається через outline-color: transparent
  if (/outline-color\s*:\s*transparent/.test(cssAll)) fail("CSS: outline-color: transparent ховає фокус");

  if (existsSync(distDir)) {
    const htmlFiles = walkDir(distDir).filter((f) => f.endsWith(".html"));
    for (const file of htmlFiles) {
      const rel = file.slice(distDir.length + 1);
      const doc = readFileSync(file, "utf-8");

      // 4. Позитивний tabindex ламає природний порядок Tab
      const positiveTab = doc.match(/\btabindex\s*=\s*"([1-9][0-9]*)"/g);
      if (positiveTab) fail(`${rel}: позитивний tabindex ${positiveTab.join(", ")} (ламає природний порядок Tab)`);

      // 5. <a> без href не фокусується клавіатурою
      // (<a id|name> — якір цілі, не лінк — дозволені)
      const anchors = doc.match(/<a(?=[\s>])[^>]*>/g) || [];
      const notFocusable = anchors.filter(
        (t) => !/\bhref\s*=/.test(t) && !/\b(id|name)\s*=/.test(t)
      );
      if (notFocusable.length) fail(`${rel}: <a> без href — не фокусується (кладе: ${notFocusable[0]})`);

      // 6. Обробники подій без JS не потрібні — але on*= в HTML вказує на JS-залишок
      // (заборонений клієнтський JS, перевіряє 7а; тут не дублюємо)
    }
    if (tbErrors === 0) {
      console.log(`  ✅ Таб-навігація: focus 2px accent у CSS, без tabindex/href-прогалин (${htmlFiles.length} сторінок)`);
    }
  } else {
    console.log("  ⚠️  dist/ не існує. Пропущено.");
  }
}
console.log("");

// 7н. Skip-link — крок 135. TECH_STANDARDS §63: <a href="#main" class="skip-link">,
// перший елемент, <main id="main">, видимий при фокусі.
console.log("--- 7н. Skip-link ---");
{
  let skErrors = 0;
  const fail = (msg) => {
    console.log(`  ❌ ${msg}`);
    skErrors++;
    totalErrors++;
  };

  // CSS: .skip-link:focus має повертати елемент у потік/видимість
  const cssAll = walkDir(stylesDir)
    .filter((f) => f.endsWith(".css"))
    .map((f) => readFileSync(f, "utf-8"))
    .join("\n");
  if (!/\.skip-link\b/.test(cssAll)) {
    fail("CSS: немає правил .skip-link");
  } else if (!/\.skip-link:focus\b[^{]*\{[^}]*\}/.test(cssAll)) {
    fail("CSS: немає стану .skip-link:focus — лінк лишиться прихованим назавжди");
  }

  if (existsSync(distDir)) {
    const htmlFiles = walkDir(distDir).filter((f) => f.endsWith(".html"));
    for (const file of htmlFiles) {
      const rel = file.slice(distDir.length + 1);
      const doc = readFileSync(file, "utf-8");

      const skip = doc.match(/<a\s+class="skip-link"\s+href="#main"[^>]*>/);
      if (!skip) {
        fail(`${rel}: немає skip-link (<a class="skip-link" href="#main">)`);
        continue;
      }
      // Перший <a> документа — саме skip-link (оминання шапки з першого Tab).
      // Порівнюємо позицію САМОГО тега skip-link, не атрибута class
      // (клас завжди пізніше за "<a " — інакше хибні спрацювання).
      const firstAnchor = doc.indexOf("<a ");
      const skipTagPos = doc.indexOf('<a class="skip-link"');
      if (firstAnchor !== -1 && skipTagPos !== firstAnchor) {
        fail(`${rel}: skip-link не перший лінк (порядок Tab починається не з нього)`);
      }
      // main id
      if (!/<main\s+id="main"/.test(doc)) {
        fail(`${rel}: <main> без id="main" (ціль #main не існує)`);
      }
    }
    if (skErrors === 0) {
      console.log(`  ✅ Skip-link: ${htmlFiles.length} сторінок — перший лінк, ціль #main, CSS:focus є`);
    }
  } else {
    console.log("  ⚠️  dist/ не існує. Пропущено.");
  }
}
console.log("");

// 7о. JSON-LD — крок 152. TECH_STANDARDS §9, PLAN 151:
// валідний JSON, @context, @graph; Person (name одне, решта в alternateName,
// sameAs — лише GitHub), WebSite (name/url/description).
console.log("--- 7о. JSON-LD ---");
{
  let ldErrors = 0;
  const fail = (msg) => {
    console.log(`  ❌ ${msg}`);
    ldErrors++;
    totalErrors++;
  };

  if (!existsSync(distDir)) {
    console.log("  ⚠️  dist/ не існує. Пропущено.");
  } else {
    const htmlFiles = walkDir(distDir).filter((f) => f.endsWith(".html"));
    let blocks = 0;

    for (const file of htmlFiles) {
      const rel = file.slice(distDir.length + 1);
      const content = readFileSync(file, "utf-8");
      const matches = [...content.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

      for (const m of matches) {
        blocks++;
        let data;
        try {
          data = JSON.parse(m[1]);
        } catch (e) {
          fail(`${rel}: JSON-LD не парситься (${e.message})`);
          continue;
        }
        if (data["@context"] !== "https://schema.org") {
          fail(`${rel}: @context ≠ https://schema.org (отримано «${data["@context"]}»)`);
        }
        const graph = Array.isArray(data["@graph"]) ? data["@graph"] : data["@type"] ? [data] : null;
        if (!graph) {
          fail(`${rel}: немає ні @graph, ні @type`);
          continue;
        }

        for (const node of graph) {
          if (node["@type"] === "Person") {
            if (typeof node.name !== "string" || !node.name.trim()) fail(`${rel}: Person.name порожній`);
            const alt = node.alternateName;
            if (!Array.isArray(alt) || alt.length === 0) {
              fail(`${rel}: Person.alternateName не масив або порожній (решта форм — сюди, §9)`);
            } else {
              if (alt.includes(node.name)) fail(`${rel}: Person.name дублюється в alternateName (name має бути одним)`);
              for (const a of alt) {
                if (typeof a !== "string" || !a.trim()) fail(`${rel}: порожній елемент alternateName`);
              }
            }
            const same = node.sameAs;
            if (!Array.isArray(same) || same.length === 0) {
              fail(`${rel}: Person.sameAs не масив або порожній`);
            } else {
              for (const u of same) {
                if (!/^https:\/\/github\.com\//.test(u)) fail(`${rel}: sameAs не GitHub (§9: лише GitHub) — «${u}»`);
              }
            }
          }
          if (node["@type"] === "WebSite") {
            if (typeof node.name !== "string" || !node.name.trim()) fail(`${rel}: WebSite.name порожній`);
            if (typeof node.url !== "string" || !/^https:\/\/koztechie\.fyi\//.test(node.url)) {
              fail(`${rel}: WebSite.url ≠ https://koztechie.fyi/ — «${node.url}»`);
            }
            if (typeof node.description !== "string" || !node.description.trim()) fail(`${rel}: WebSite.description порожній`);
          }
        }
      }
    }

    if (ldErrors === 0) {
      console.log(`  ✅ JSON-LD валідний: ${blocks} блок(и) у ${htmlFiles.length} HTML — Person/WebSite за §9`);
    }
  }
}
console.log("");

// 7п. Канонічний URL — крок 153. TECH_STANDARDS §9: rel="canonical" на кожній
// сторінці, абсолютний, self-reference. 404 — поза canonical (§9.8.4: поза
// sitemap і hreflang). Дублікати canonical двох сторінок — помилка.
console.log("--- 7п. Канонічний URL ---");
{
  let caErrors = 0;
  const fail = (msg) => {
    console.log(`  ❌ ${msg}`);
    caErrors++;
    totalErrors++;
  };

  if (!existsSync(distDir)) {
    console.log("  ⚠️  dist/ не існує. Пропущено.");
  } else {
    const htmlFiles = walkDir(distDir).filter((f) => f.endsWith(".html"));
    const seen = new Map();

    for (const file of htmlFiles) {
      const rel = file.slice(distDir.length + 1);
      const content = readFileSync(file, "utf-8");
      const is404 = rel === "404.html";
      const found = [...content.matchAll(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["']/gi)]
        .concat([...content.matchAll(/<link\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']canonical["']/gi)]);

      if (is404) {
        if (found.length) fail(`${rel}: canonical присутній (404 — поза canonical/sitemap, §9.8.4)`);
        continue;
      }

      if (found.length === 0) {
        fail(`${rel}: немає rel="canonical"`);
        continue;
      }
      if (found.length > 1) fail(`${rel}: ${found.length} canonical (має бути 1)`);

      const href = found[0][1];
      if (!href.startsWith("https://koztechie.fyi/")) {
        fail(`${rel}: canonical не абсолютний домен — «${href}»`);
        continue;
      }
      // Self-reference: canonical = URL цієї сторінки
      const path =
        rel === "index.html"
          ? "/"
          : rel.endsWith("/index.html")
            ? "/" + rel.slice(0, -"index.html".length)
            : "/" + rel;
      const expected = "https://koztechie.fyi" + path;
      if (href !== expected) {
        fail(`${rel}: canonical ≠ self (очікував «${expected}», отримав «${href}»)`);
      }
      // Унікальність: одна адреса не може бути canonical двох сторінок
      if (seen.has(href)) {
        fail(`${rel}: canonical дублює ${seen.get(href)} («${href}»)`);
      } else {
        seen.set(href, rel);
      }
    }

    if (caErrors === 0) {
      console.log(`  ✅ Canonical: ${seen.size} сторінок — абсолютні, self-reference, унікальні; 404 поза`);
    }
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
