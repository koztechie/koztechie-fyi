#!/usr/bin/env node
// check.mjs: автономний чекліст ВУЗОЛ-0 (без залежностей)
// Перевіряє: бюджети, CSS-патерни, hex, сторонні origin, head, UI-хардкод, h1, alt, href, lang, entry, ШІ-політику, RSS-фіди, лінки, перемикач мов, таб-навігацію, skip-link, JSON-LD, canonical.
// Використання: node scripts/check.mjs [dist/]

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { createHash } from "node:crypto";
import { brotliCompressSync, constants as zlibConstants } from "node:zlib";
import { selectActiveCssFiles } from "./active-css.mjs";
import { readThemeColors } from "./theme-colors.mjs";
import { getBuildEpoch, getBuildSha } from "./build-provenance.mjs";
import { auditHomeContactHierarchy } from "./home-contact-contract.mjs";
import { auditHomeConcept } from "./home-concept-contract.mjs";

const distDir = resolve(process.argv[2] || "dist");
const stylesDir = resolve("src/styles");
const themeColors = readThemeColors();

let totalErrors = 0;
let totalWarnings = 0;

console.log("=== CHECK (ВУЗОЛ-0) ===");
console.log(`dist: ${distDir}`);
console.log("");

// Deploy provenance: HEAD meta та version.json мають ідентифікувати той самий build.
console.log("--- DEPLOY PROVENANCE ---");
const versionPath = join(distDir, "version.json");
if (!existsSync(versionPath)) {
  console.log("  ❌ dist/version.json відсутній");
  totalErrors++;
} else {
  let version;
  try {
    version = JSON.parse(readFileSync(versionPath, "utf8"));
  } catch {
    version = null;
  }

  const expectedSha = getBuildSha();
  const expectedEpoch = getBuildEpoch();
  const validEpoch = version?.epoch === null
    || (Number.isSafeInteger(version?.epoch) && version.epoch >= 0);
  const epochMatches = expectedEpoch === null || version?.epoch === expectedEpoch;
  if (!version || version.sha !== expectedSha || !validEpoch || !epochMatches) {
    console.log(
      `  ❌ version.json: очікується ${JSON.stringify({ sha: expectedSha, epoch: expectedEpoch })}, отримано ${JSON.stringify(version)}`,
    );
    totalErrors++;
  } else {
    console.log(`  ✅ version.json: ${version.sha || "невідомий commit"}, epoch=${version.epoch}`);
  }

  let invalidMeta = 0;
  for (const file of walkDir(distDir).filter((path) => path.endsWith(".html"))) {
    const html = readFileSync(file, "utf8");
    if (!html.includes(`<meta name="x-commit" content="${expectedSha}">`)) {
      invalidMeta++;
      totalErrors++;
    }
  }
  if (invalidMeta) {
    console.log(`  ❌ x-commit meta відсутній або не збігається у ${invalidMeta} HTML-файлах`);
  } else {
    console.log("  ✅ x-commit meta збігається в усіх HTML-файлах");
  }
}
console.log("");

// G-14/F-05. Заява про доступність не може старіти, а feedback-канал має
// залишатися присутнім у зібраному сайті. Живість DNS/mailbox перевіряє G-01.
console.log("--- G-14 ACCESSIBILITY STATEMENT ---");
const statementMaxAgeDays = Number(process.env.A11Y_STATEMENT_MAX_AGE_DAYS || 90);
const accessibilitySources = [
  resolve("content/uk/pages/accessibility.md"),
  resolve("content/en/pages/accessibility.md"),
];
let statementErrors = 0;
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
for (const file of accessibilitySources) {
  const rel = file.replace(`${resolve(".")}/`, "");
  if (!existsSync(file)) {
    console.log(`  ❌ ${rel}: файл заяви відсутній`);
    statementErrors++;
    totalErrors++;
    continue;
  }
  const source = readFileSync(file, "utf8");
  const date = source.match(/^updated:\s*(\d{4}-\d{2}-\d{2})\s*$/m)?.[1];
  const parsed = date ? new Date(`${date}T00:00:00Z`) : null;
  const ageDays = parsed ? Math.floor((today - parsed) / 86_400_000) : Infinity;
  if (!parsed || Number.isNaN(parsed.getTime()) || ageDays < 0 || ageDays > statementMaxAgeDays) {
    console.log(`  ❌ ${rel}: updated=${date || "відсутня"}, допустимий вік — ${statementMaxAgeDays} днів`);
    statementErrors++;
    totalErrors++;
  }
}
const accessibilityHtml = accessibilitySources
  .map((file) => join(distDir, file.includes("/uk/") ? "accessibility/index.html" : "en/accessibility/index.html"))
  .filter((file, index, files) => files.indexOf(file) === index);
for (const file of accessibilityHtml) {
  const rel = file.replace(`${distDir}/`, "");
  if (!existsSync(file) || !/<a\b[^>]*href=["']mailto:/i.test(readFileSync(file, "utf8"))) {
    console.log(`  ❌ ${rel}: feedback mailto-канал відсутній`);
    statementErrors++;
    totalErrors++;
  }
}
const securityFile = join(distDir, ".well-known/security.txt");
if (!existsSync(securityFile) || !/^Contact:\s*mailto:/mi.test(readFileSync(securityFile, "utf8"))) {
  console.log("  ❌ .well-known/security.txt: G-01 Contact відсутній");
  statementErrors++;
  totalErrors++;
}
if (statementErrors === 0) {
  console.log(`  ✅ G-14: дата заяви ≤${statementMaxAgeDays} днів; feedback і G-01 Contact присутні`);
}
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
  console.log("--- CHECK-EMAIL-PLAIN ---");
  let plainEmailErrors = 0;
  const securityEmailSpans = new Set();
  for (const file of htmlFiles) {
    const rel = file.replace(distDir + "/", "");
    const lines = readFileSync(file, "utf-8").split(/\r?\n/);
    lines.forEach((line, index) => {
      const permittedContact = /^(?:en\/)?contact\/index\.html$/.test(rel);
      const exactSecuritySpan = '<code class="contact-address">hello@koztechie.fyi</code>';
      if (permittedContact && line.includes(exactSecuritySpan)) {
        securityEmailSpans.add(rel);
      }
      const scannedLine = permittedContact
        ? line.replaceAll(exactSecuritySpan, "")
        : line;
      if (/hello@koztechie\.fyi/.test(scannedLine)) {
        console.log(`  ❌ ${rel}:${index + 1}: plain email address`);
        plainEmailErrors++;
        totalErrors++;
      }
    });
  }
  for (const rel of ["contact/index.html", "en/contact/index.html"]) {
    if (!securityEmailSpans.has(rel)) {
      console.log(`  ❌ ${rel}: security email is not rendered as the sanctioned code span`);
      plainEmailErrors++;
      totalErrors++;
    }
  }
  if (plainEmailErrors === 0) {
    console.log("  ✅ CHECK-EMAIL-PLAIN: plain=0 у всіх dist/**/*.html");
  }

  console.log("--- RSS auto-discovery titles ---");
  let rssTitleErrors = 0;
  for (const file of htmlFiles) {
    const rel = file.replace(distDir + "/", "");
    const html = readFileSync(file, "utf-8");
    const rssLinks = [...html.matchAll(/<link\b([^>]*)>/gi)]
      .map(([, attrs]) => Object.fromEntries(
        [...attrs.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)]
          .map(([, key, value]) => [key.toLowerCase(), value])
      ))
      .filter((attrs) =>
        attrs.rel === "alternate" &&
        attrs.type === "application/rss+xml"
      );
    if (rssLinks.length !== 2 || rssLinks.some((attrs) => !attrs.title?.trim())) {
      console.log(`  ❌ ${rel}: очікуються два RSS alternate-посилання з непорожніми title`);
      rssTitleErrors++;
      totalErrors++;
    }
  }
  if (rssTitleErrors === 0) {
    console.log(`  ✅ ${htmlFiles.length} HTML-файлів: обидва RSS title непорожні`);
  }

  console.log("--- SEO title/description budgets ---");
  let seoBudgetErrors = 0;
  for (const file of htmlFiles) {
    const rel = file.replace(distDir + "/", "");
    const html = readFileSync(file, "utf-8");
    const titleMatches = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)];
    const descriptionTags = [...html.matchAll(/<meta\b[^>]*>/gi)]
      .map(([tag]) => parseHtmlAttributes(tag))
      .filter((attributes) => attributes.name?.toLowerCase() === "description");
    const title = titleMatches.length === 1
      ? displayText(titleMatches[0][1])
      : "";
    const description = descriptionTags.length === 1
      ? decodeHtmlEntities(descriptionTags[0].content || "").trim()
      : "";
    const titleLength = [...title].length;
    const descriptionLength = [...description].length;

    if (titleMatches.length !== 1 || titleLength === 0) {
      console.log(`  ❌ ${rel}: потрібен рівно один непорожній <title>`);
      seoBudgetErrors++;
      totalErrors++;
    } else if (titleLength > 60) {
      console.log(`  ❌ ${rel}: title має ${titleLength} символів (ліміт 60)`);
      seoBudgetErrors++;
      totalErrors++;
    }

    if (descriptionTags.length !== 1 || descriptionLength === 0) {
      console.log(`  ❌ ${rel}: потрібен рівно один непорожній meta description`);
      seoBudgetErrors++;
      totalErrors++;
    } else if (descriptionLength > 155) {
      console.log(`  ❌ ${rel}: description має ${descriptionLength} символів (ліміт 155)`);
      seoBudgetErrors++;
      totalErrors++;
    }
  }
  if (seoBudgetErrors === 0) {
    console.log(`  ✅ ${htmlFiles.length} HTML-файлів: 0 title понад 60 і 0 description понад 155 символів`);
  }

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

  // G-06. Повний webmanifest без PWA-претензій (F-15).
  console.log("--- G-06 WEBMANIFEST ---");
  const manifestFile = join(distDir, "site.webmanifest");
  let manifestErrors = 0;
  const manifestRequired = {
    id: "/",
    start_url: "/",
    scope: "/",
    display: "browser",
    lang: "uk",
    name: "koztechie",
    short_name: "koztechie",
    description: "Текст без прикрас. Архівний вузол Євгенія Козловського.",
    theme_color: themeColors.paper,
    background_color: themeColors.paper,
  };
  if (!existsSync(manifestFile)) {
    console.log("  ❌ site.webmanifest відсутній");
    manifestErrors++;
    totalErrors++;
  } else {
    try {
      const manifest = JSON.parse(readFileSync(manifestFile, "utf-8"));
      for (const [key, expected] of Object.entries(manifestRequired)) {
        if (manifest[key] !== expected) {
          console.log(`  ❌ site.webmanifest: ${key} має «${manifest[key] ?? "відсутнє"}», очікується «${expected}»`);
          manifestErrors++;
          totalErrors++;
        }
      }
      const icon = Array.isArray(manifest.icons)
        ? manifest.icons.find((item) => item?.src === "/favicon.svg")
        : null;
      if (!icon || icon.sizes !== "any" || icon.type !== "image/svg+xml") {
        console.log("  ❌ site.webmanifest: відсутня коректна SVG-іконка /favicon.svg");
        manifestErrors++;
        totalErrors++;
      }
      const pngIcons = Array.isArray(manifest.icons)
        ? manifest.icons.filter((item) => item?.type === "image/png")
        : [];
      let hasLargePngIcon = false;
      for (const pngIcon of pngIcons) {
        const iconPath = pngIcon.src?.startsWith("/")
          ? join(distDir, pngIcon.src.slice(1))
          : "";
        const sizeMatch = pngIcon.sizes?.match(/^(\d+)x(\d+)$/);
        if (!iconPath || !sizeMatch || !existsSync(iconPath)) {
          console.log(`  ❌ site.webmanifest: PNG-іконка має відсутній файл або некоректні sizes (${pngIcon.src || "без src"})`);
          manifestErrors++;
          totalErrors++;
          continue;
        }
        const expectedWidth = Number(sizeMatch[1]);
        const expectedHeight = Number(sizeMatch[2]);
        const image = readFileSync(iconPath);
        if (
          image.toString("ascii", 1, 4) !== "PNG" ||
          image.readUInt32BE(16) !== expectedWidth ||
          image.readUInt32BE(20) !== expectedHeight
        ) {
          console.log(`  ❌ ${pngIcon.src}: фактичні розміри не збігаються з ${pngIcon.sizes}`);
          manifestErrors++;
          totalErrors++;
        }
        if (expectedWidth >= 192 && expectedHeight >= 192) hasLargePngIcon = true;
      }
      if (!hasLargePngIcon) {
        console.log("  ❌ site.webmanifest: потрібна PNG-іконка щонайменше 192×192");
        manifestErrors++;
        totalErrors++;
      }
    } catch (error) {
      console.log(`  ❌ site.webmanifest: невалідний JSON (${error.message})`);
      manifestErrors++;
      totalErrors++;
    }
  }
  if (manifestErrors === 0) console.log("  ✅ G-06: webmanifest містить повний обов'язковий набір полів");

  // G-07. Гігієна шаблонів: невикористані блоки та довжина browser title (F-17/F-18/F-20).
  console.log("--- G-07 TEMPLATE HYGIENE ---");
  let templateErrors = 0;
  const templateError = (message) => {
    console.log(`  ❌ ${message}`);
    templateErrors++;
    totalErrors++;
  };
  const homeTemplate = resolve("src/templates/home.njk");
  if (existsSync(homeTemplate)) {
    const source = readFileSync(homeTemplate, "utf-8");
    if (/\{%-?\s*block\s+og_description\b/.test(source)) {
      templateError("home.njk: невикористаний block og_description");
    }
    if (/letter-cta|letter-note|cta_text|cta_note|ctaHref/.test(source)) {
      templateError("home.njk: герой не має окремого CTA або примітки про відповідь");
    }
  }
  const stringsDir = resolve("src/_data/strings");
  for (const lang of ["uk", "en"]) {
    const stringsFile = join(stringsDir, `${lang}.json`);
    if (!existsSync(stringsFile)) {
      templateError(`strings.${lang}.json відсутній`);
      continue;
    }
    try {
      const data = JSON.parse(readFileSync(stringsFile, "utf-8"));
      if (Object.hasOwn(data.home || {}, "cta_text") || Object.hasOwn(data.home || {}, "cta_note")) {
        templateError(`strings.${lang}.home: ключі CTA не належать до архівної головної`);
      }
      const browserTitle = data.home?.browser_title;
      if (typeof browserTitle !== "string" || !browserTitle.trim()) {
        templateError(`strings.${lang}.home.browser_title порожній`);
      } else if (browserTitle.length > 60) {
        templateError(`strings.${lang}.home.browser_title має ${browserTitle.length} символів (ліміт 60)`);
      }
    } catch (error) {
      templateError(`strings.${lang}.json: невалідний JSON (${error.message})`);
    }
  }
  for (const [lang, relativePath] of [
    ["uk", "index.html"],
    ["en", join("en", "index.html")],
  ]) {
    const homePath = join(distDir, relativePath);
    if (!existsSync(homePath)) {
      templateError(`${lang}: dist головної відсутній`);
      continue;
    }
    for (const error of auditHomeContactHierarchy(readFileSync(homePath, "utf-8"), lang)) {
      templateError(`${lang}: home contact hierarchy: ${error}`);
    }
    for (const error of auditHomeConcept(readFileSync(homePath, "utf-8"), lang)) {
      templateError(`${lang}: home concept: ${error}`);
    }
  }
  const postTemplate = resolve("src/templates/post.njk");
  if (!existsSync(postTemplate)
      || !/defaultPostImage\s*=\s*"\/og\/home-en-v2\.png"\s+if\s+lang\s*===\s*"en"/.test(readFileSync(postTemplate, "utf-8"))
      || !/\(og_image\s+if\s+og_image\s+else\s+defaultPostImage\)/.test(readFileSync(postTemplate, "utf-8"))) {
    templateError("post.njk: BlogPosting.image не має мовно-залежного дефолту");
  }
  if (templateErrors === 0) {
    console.log("  ✅ G-07: template hygiene, browser title ≤60, OG fallback, ієрархія контактів і концепція головної");
  }

  // 1b. Бюджет активної CSS-пари (brotli) — DECISIONS.md §44.1, TECH_STANDARDS §1
  const distCSS = selectActiveCssFiles(distDir, walkDir(distDir).filter((f) => f.endsWith(".css")));
  if (distCSS.length > 0) {
    let totalCSS = 0;
    for (const file of distCSS) {
      const content = readFileSync(file);
      const brotli = brotliCompressSync(content, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 } });
      totalCSS += brotli.length;
    }
    const sizeKB = totalCSS / 1024;
    if (sizeKB > 15) {
      console.log(`  ❌ Активний CSS: ${sizeKB.toFixed(1)} КБ (бюджет 15 КБ)`);
      totalErrors++;
    } else {
      console.log(`  ✅ Активна CSS-пара: ${sizeKB.toFixed(1)} КБ (бюджет 15 КБ)`);
    }
  }

  // G-19. NICHLYST LCP image is eager/high priority and uses its small responsive source.
  console.log("--- G-19 NICHLYST LCP IMAGE ---");
  const lcpImageErrors = [];
  const lcpVariants = [
    ["uk", join(distDir, "nichlyst", "index.html")],
    ["en", join(distDir, "en", "nichlyst", "index.html")],
  ];
  const imageAttribute = (tag, name) =>
    tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] || "";
  for (const [lang, pagePath] of lcpVariants) {
    if (!existsSync(pagePath)) {
      lcpImageErrors.push(`${lang}: NICHLYST HTML відсутній`);
      continue;
    }
    const html = readFileSync(pagePath, "utf8");
    const gallery = html.match(/<div class="nichlyst-gallery">([\s\S]*?)<\/div>/)?.[1] || "";
    const figures = [...gallery.matchAll(/<figure>([\s\S]*?)<\/figure>/g)].map((match) => match[1]);
    const firstTag = figures[0]?.match(/<img\b[^>]*>/)?.[0] || "";
    if (figures.length !== 3 || !firstTag) {
      lcpImageErrors.push(`${lang}: галерея має містити 3 figure та перше img`);
      continue;
    }
    const required = {
      src: "/nichlyst/first-knock.webp",
      loading: "eager",
      fetchpriority: "high",
      decoding: "async",
      srcset: "/nichlyst/first-knock-450.webp 450w, /nichlyst/first-knock-700.webp 700w, /nichlyst/first-knock.webp 900w",
      sizes: "(max-width: 40rem) calc(100vw - 2rem), 40rem",
    };
    for (const [attribute, value] of Object.entries(required)) {
      if (imageAttribute(firstTag, attribute) !== value) {
        lcpImageErrors.push(`${lang}: LCP img має ${attribute}="${value}"`);
      }
    }
    for (const [index, figure] of figures.slice(1).entries()) {
      const tag = figure.match(/<img\b[^>]*>/)?.[0] || "";
      if (imageAttribute(tag, "loading") !== "lazy") {
        lcpImageErrors.push(`${lang}: кадр галереї ${index + 2} має залишатися loading="lazy"`);
      }
    }
    for (const [width, filename] of [
      [450, "first-knock-450.webp"],
      [700, "first-knock-700.webp"],
    ]) {
      const variantPath = join(distDir, "nichlyst", filename);
      if (!existsSync(variantPath)) {
        lcpImageErrors.push(`${lang}: responsive ${width}w asset відсутній`);
      } else {
        const bytes = statSync(variantPath).size;
        if (bytes < 13 * 1024 || bytes > 18 * 1024) {
          lcpImageErrors.push(`${lang}: responsive ${width}w asset має ${bytes} байт, очікується 13–18 КіБ`);
        }
      }
    }
  }
  if (lcpImageErrors.length) {
    for (const error of lcpImageErrors) console.log(`  ❌ ${error}`);
    totalErrors += lcpImageErrors.length;
  } else {
    console.log("  ✅ uk/en: перший кадр eager + high priority; 450w/700w 13–18 КіБ; решта кадрів lazy");
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

  // Згенерована таблиця стилів і іконки мають бути за шляхами з HTML.
  const requiredAssets = [
    "favicon.svg",
    "favicon.ico",
    "apple-touch-icon.png",
    "site.webmanifest",
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
    console.log(`  ✅ Іконки на місці: ${requiredAssets.length} файлів`);
  }
  const appleIconPath = join(distDir, "apple-touch-icon.png");
  if (existsSync(appleIconPath)) {
    const appleIcon = readFileSync(appleIconPath);
    if (
      appleIcon.toString("ascii", 1, 4) !== "PNG" ||
      appleIcon.readUInt32BE(16) !== 180 ||
      appleIcon.readUInt32BE(20) !== 180
    ) {
      console.log("  ❌ apple-touch-icon.png: очікувався PNG розміром 180×180");
      assetErrors++;
      totalErrors++;
    } else {
      console.log("  ✅ apple-touch-icon.png має розмір 180×180");
    }
  }

  const builtStylesDir = join(distDir, "styles");
  const builtStyles = existsSync(builtStylesDir)
    ? readdirSync(builtStylesDir).filter((file) => file.endsWith(".css"))
    : [];
  const siteBundles = builtStyles.filter((file) => /^site\.[a-f0-9]{12}\.css$/.test(file));
  const printBundles = builtStyles.filter((file) => /^print\.[a-f0-9]{12}\.css$/.test(file));
  if (siteBundles.length === 0 || siteBundles.length > 3 ||
      printBundles.length === 0 || printBundles.length > 3 || builtStyles.length > 6) {
    console.log("  ❌ dist/styles/ має містити максимум 3 site.css і 3 print.css");
    totalErrors++;
  }

  let stylesheetErrors = 0;
  for (const file of htmlWithStyle) {
    const html = readFileSync(file, "utf-8");
    const screenStyles = html.match(/<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']\/styles\/site\.[a-f0-9]{12}\.css["'])[^>]*>/gi) || [];
    const printStyles = html.match(/<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']\/styles\/print\.[a-f0-9]{12}\.css["'])[^>]*>/gi) || [];
    const rel = file.slice(distDir.length + 1);
    if (screenStyles.length !== 1 || !existsSync(join(distDir, screenStyles[0]?.match(/\bhref=["']\/([^"']+)/i)?.[1] || "__missing__"))) {
      console.log(`  ❌ ${rel} — має бути один наявний fingerprinted екранний stylesheet`);
      stylesheetErrors++;
    }
    if (printStyles.length !== 1 || !/\bmedia=["']print["']/i.test(printStyles[0] || "") ||
        !existsSync(join(distDir, printStyles[0]?.match(/\bhref=["']\/([^"']+)/i)?.[1] || "__missing__"))) {
      console.log(`  ❌ ${rel} — print.css має бути fingerprinted, наявний і підключений лише з media="print"`);
      stylesheetErrors++;
    }
  }
  if (stylesheetErrors > 0) totalErrors += stylesheetErrors;
  else console.log(`  ✅ Stylesheet: fingerprinted CSS на місці (${siteBundles.length} site + ${printBundles.length} print; ${htmlWithStyle.length} сторінок)`);
} else {
  console.log("  ⚠️  dist/ не існує. Пропущено.");
}
console.log("");

// 2. CSS: спільний бюджет усіх таблиць стилів.
console.log("--- 2. CSS ---");
if (existsSync(stylesDir)) {
  const cssFiles = walkDir(stylesDir).filter((f) => f.endsWith(".css"));
  const cssBytes = cssFiles.reduce((sum, file) => {
    const bytes = readFileSync(file);
    return sum + brotliCompressSync(bytes, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 } }).length;
  }, 0);
  if (cssBytes > 15 * 1024) {
    console.log(`  ❌ CSS: ${(cssBytes / 1024).toFixed(1)} КБ > 15 КБ`);
    totalErrors++;
  } else {
    console.log(`  ✅ ${cssFiles.length} CSS-файлів: ${(cssBytes / 1024).toFixed(1)} КБ`);
  }
} else {
  console.log("  ⚠️  src/styles/ не існує. Пропущено.");
}
if (existsSync(join(stylesDir, "layout.css"))) {
  const layoutCss = readFileSync(join(stylesDir, "layout.css"), "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const hoverRule = layoutCss.match(/^\s*a:hover\s*\{([^{}]*)\}/m);
  const hoverDeclarations = hoverRule?.[1] || "";
  if (
    !/color\s*:\s*var\(--ink\)/.test(hoverDeclarations) ||
    !/background\s*:\s*transparent/.test(hoverDeclarations) ||
    !/text-decoration-thickness\s*:\s*3px/.test(hoverDeclarations)
  ) {
    console.log("  ❌ Глобальний hover має бути чорнильним, без заливки, з підкресленням 3px");
    totalErrors++;
  } else {
    console.log("  ✅ Глобальний hover: чорнило, прозоре тло, підкреслення 3px");
  }

  const cssFiles = walkDir(stylesDir).filter((file) => file.endsWith(".css"));
  let oldStateTokenErrors = 0;
  for (const file of cssFiles) {
    const css = readFileSync(file, "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/var\(--(?:living|green)\b/.test(match[2])) continue;
      const rel = file.slice(stylesDir.length + 1);
      const line = css.slice(0, match.index).split("\n").length;
      console.log(`  ❌ ${rel}:${line} — застарілий колірний токен стану`);
      oldStateTokenErrors++;
      totalErrors++;
    }
  }
  if (oldStateTokenErrors === 0) {
    console.log("  ✅ Стани не залежать від вилученого зеленого токена");
  }
}
if (existsSync(stylesDir)) {
  let visitedStateErrors = 0;
  for (const file of walkDir(stylesDir).filter((path) => path.endsWith(".css"))) {
    const css = readFileSync(file, "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = match[1].trim();
      if (!/:visited\b/.test(selector)) continue;
      for (const declaration of match[2].split(";").map((item) => item.trim()).filter(Boolean)) {
        const property = declaration.split(":", 1)[0].trim().toLowerCase();
        if (property !== "color") {
          console.log(`  ❌ :visited не може задавати «${property}» у ${file.slice(stylesDir.length + 1)} (${selector})`);
          visitedStateErrors++;
        }
      }
    }
  }
  if (visitedStateErrors) totalErrors += visitedStateErrors;
  else console.log("  ✅ :visited не має не-color декларацій");
}
console.log("--- Chrome: пурпурне тло ---");
const chromeSelector = /\.(?:site-header|site-footer|home-hero)\b/;
const chromeBackgroundErrors = [];
for (const file of walkDir(stylesDir).filter((path) => path.endsWith(".css"))) {
  const css = readFileSync(file, "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!chromeSelector.test(match[1])) continue;
    if (/background(?:-color)?\s*:\s*var\(--accent(?![a-z-])/i.test(match[2])) {
      const line = css.slice(0, match.index).split("\n").length;
      chromeBackgroundErrors.push(`${file.slice(stylesDir.length + 1)}:${line}`);
    }
  }
}
if (chromeBackgroundErrors.length) {
  for (const location of chromeBackgroundErrors) {
    console.log(`  ❌ ${location} — пурпурне тло заборонене для chrome`);
    totalErrors++;
  }
} else {
  console.log("  ✅ Chrome-селектори не мають пурпурного тла");
}
console.log("");

// 3. Кольори поза єдиним джерелом themes.css
console.log("--- 3. Кольори поза themes.css ---");
const colorRegex = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/gi;
if (existsSync(stylesDir)) {
  const cssFiles = walkDir(stylesDir).filter(
    (f) => f.endsWith(".css") && f !== join(stylesDir, "themes.css")
  );
  let colorErrors = 0;
  for (const file of cssFiles) {
    const content = readFileSync(file, "utf-8");
    const rel = file.replace(stylesDir + "/", "");
    for (const match of content.matchAll(colorRegex)) {
        const line = content.slice(0, match.index).split("\n").length;
        console.log(`  ❌ ${rel}:${line} — колір ${match[0]}`);
        colorErrors++;
        totalErrors++;
    }
  }
  if (colorErrors === 0) {
    console.log("  ✅ HEX, rgb() і hsl() є лише в themes.css");
  }
} else {
  console.log("  ⚠️  src/styles/ не існує. Пропущено.");
}
console.log("");

// 2а. Reflow: приховування горизонтального переповнення заборонене.
console.log("--- 2а. Reflow: без overflow-x:hidden ---");
const overflowHiddenFiles = existsSync(stylesDir)
  ? walkDir(stylesDir)
      .filter((file) => file.endsWith(".css"))
      .filter((file) => /overflow-x\s*:\s*hidden\b/i.test(readFileSync(file, "utf-8")))
  : [];
if (overflowHiddenFiles.length > 0) {
  for (const file of overflowHiddenFiles) {
    console.log(`  ❌ ${file.slice(stylesDir.length + 1)} — overflow-x:hidden приховує переповнення`);
    totalErrors++;
  }
} else {
  console.log("  ✅ overflow-x:hidden у src/styles відсутній");
}
console.log("");

// 2б. Тач-цілі навігації — WCAG 2.5.8 та DECISIONS.md §9.5.
console.log("--- 2б. Тач-цілі навігації ---");
const tapSelectors = [".site-nav a", ".archive-list a", ".pagination a", ".footer-nav a", ".lang-switch a"];
const cssRules = existsSync(stylesDir)
  ? walkDir(stylesDir)
      .filter((file) => file.endsWith(".css"))
      .flatMap((file) => {
        const css = readFileSync(file, "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
        return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
          selectors: match[1].split(",").map((selector) => selector.trim()),
          declarations: match[2],
        }));
      })
  : [];
const missingTapRules = tapSelectors.filter((selector) =>
  !cssRules.some((rule) =>
    rule.selectors.includes(selector) && /min-height\s*:\s*var\(--tap\)/.test(rule.declarations)
  )
);
if (missingTapRules.length > 0) {
  console.log(`  ❌ Немає min-height: var(--tap) для: ${missingTapRules.join(", ")}`);
  totalErrors++;
} else {
  console.log(`  ✅ ${tapSelectors.length} навігаційних селекторів мають min-height: var(--tap)`);
}
console.log("");

// 2в. Стабільна ширина тексту: hover/active не змінюють font-weight.
console.log("--- 2в. Стабільна вага станів посилань ---");
const unstableLinkStates = [];
if (existsSync(stylesDir)) {
  for (const file of walkDir(stylesDir).filter((path) => path.endsWith(".css"))) {
    const css = readFileSync(file, "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const match of css.matchAll(/([^{}]*(?:a:hover|a:active)[^{}]*)\{([^{}]*)\}/g)) {
      if (/font-weight\s*:/.test(match[2])) {
        unstableLinkStates.push(file.slice(stylesDir.length + 1));
      }
    }
  }
}
if (unstableLinkStates.length > 0) {
  console.log(`  ❌ font-weight у hover/active правилах: ${[...new Set(unstableLinkStates)].join(", ")}`);
  totalErrors++;
} else {
  console.log("  ✅ hover/active не змінюють font-weight");
}
console.log("");

// 2г. Reduced motion — кожне скасування має бути !important.
console.log("--- 2г. Reduced motion ---");
const reducedMotionCss = existsSync(join(stylesDir, "core.css"))
  ? readFileSync(join(stylesDir, "core.css"), "utf-8").match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/
    )?.[1] || ""
  : "";
const reducedMotionRequired = [
  /animation-duration\s*:\s*0\.01ms\s*!important/,
  /animation-iteration-count\s*:\s*1\s*!important/,
  /transition-duration\s*:\s*0\.01ms\s*!important/,
  /scroll-behavior\s*:\s*auto\s*!important/,
];
const missingReducedMotion = reducedMotionRequired.filter((pattern) => !pattern.test(reducedMotionCss));
if (missingReducedMotion.length > 0) {
  console.log(`  ❌ Неповний reduced-motion reset: ${missingReducedMotion.length} правил без !important`);
  totalErrors++;
} else {
  console.log("  ✅ Reduced-motion reset містить усі !important правила");
}
console.log("");

// 2д. Символи навігації та розділювачі дозволені лише в aria-hidden span.
console.log("--- 2д. SR-розділювачі ---");
const srSymbolPattern = /[·←→▍]/;
const visibleSymbols = [];
const stripHiddenSpans = (content) =>
  content.replace(/<span\b[^>]*aria-hidden\s*=\s*["']true["'][^>]*>[\s\S]*?<\/span>/gi, "");
if (existsSync(resolve("src/templates"))) {
  for (const file of walkDir(resolve("src/templates")).filter((path) => path.endsWith(".njk"))) {
    const template = readFileSync(file, "utf-8")
      .replace(/\{#[\s\S]*?#\}/g, "");
    if (srSymbolPattern.test(stripHiddenSpans(template))) visibleSymbols.push(file);
  }
}
if (existsSync(resolve("src/_data/strings"))) {
  for (const file of walkDir(resolve("src/_data/strings")).filter((path) => path.endsWith(".json"))) {
    if (srSymbolPattern.test(readFileSync(file, "utf-8"))) visibleSymbols.push(file);
  }
}
if (existsSync(distDir)) {
  for (const file of walkDir(distDir).filter((path) => path.endsWith(".html"))) {
    if (srSymbolPattern.test(stripHiddenSpans(readFileSync(file, "utf-8")))) visibleSymbols.push(file);
  }
}
if (visibleSymbols.length > 0) {
  console.log(`  ❌ символи · ← → ▍ поза aria-hidden у: ${visibleSymbols.map((file) => file.replace(`${resolve("src/templates")}/`, "").replace(`${resolve("src/_data/strings")}/`, "").replace(`${distDir}/`, "")).join(", ")}`);
  totalErrors++;
} else {
  console.log("  ✅ Символи · ← → ▍ поза aria-hidden відсутні у шаблонах, словниках і HTML");
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
        // github.com — профіль; netlify.com і revenuecat.com — політики сервісів.
        if (m.includes("schema.org") || m.includes("w3.org") || m.includes("sitemaps.org")) continue;
        if (m.includes("github.com")) continue;
        if (m.includes("netlify.com") || m.includes("revenuecat.com")) continue;
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

// 4а. GitHub identity links — rel="me" для профілю та відкритого репозиторію.
console.log("--- 4а. GitHub rel=\"me\" ---");
if (existsSync(distDir)) {
  const htmlFiles = walkDir(distDir).filter((f) => f.endsWith(".html"));
  let githubErrors = 0;
  for (const file of htmlFiles) {
    const content = readFileSync(file, "utf-8");
    const rel = file.replace(distDir + "/", "");
    const githubLinks = content.match(/<a\b[^>]*href\s*=\s*["']https:\/\/github\.com\/[^"']+["'][^>]*>/gi) || [];
    for (const link of githubLinks) {
      const relMatch = link.match(/\brel\s*=\s*["']([^"']+)["']/i);
      if (!relMatch || !/\bme\b/.test(relMatch[1])) {
        console.log(`  ❌ ${rel} — GitHub-посилання без rel="me"`);
        githubErrors++;
        totalErrors++;
      }
    }
  }
  if (githubErrors === 0) {
    console.log(`  ✅ GitHub-посилання мають rel="me" (${htmlFiles.length} HTML перевірено)`);
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

    // Незакриті лапки datetime: значення атрибута «ковтає» решту розмітки —
    // дата ховається в атрибуті, сусідні елементи виходять з-під контролю
    // парсингу (випадок 2026-11-05: datetime="2026-10-25>…).
    if (/datetime="[^"]*>/.test(content)) {
      console.log(`  ❌ ${rel} — datetime="… незакриті лапки атрибута`);
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

// 7б. Шрифти — системні стеки, без завантажуваних файлів.
console.log("--- 7б. Шрифти ---");
const cssFiles = existsSync(stylesDir)
  ? walkDir(stylesDir).filter((f) => f.endsWith(".css"))
  : [];
let fontErrors = 0;
for (const file of cssFiles) {
  const content = readFileSync(file, "utf-8");
  const rel = file.replace(stylesDir + "/", "");
  if (/@font-face\b|url\([^)]*\.(?:woff2?|ttf|otf)/i.test(content)) {
    console.log(`  ❌ ${rel} — знайдено завантажуваний шрифт`);
    fontErrors++;
    totalErrors++;
  }
}
if (fontErrors === 0) {
  console.log("  ✅ Шрифти не завантажуються; використовуються системні стеки");
}
const fontOriginRegex = /https?:\/\/(?!koztechie\.fyi|localhost)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^"')\s]*\.(woff2?|ttf|otf)/i;
if (cssFiles.every((file) => !fontOriginRegex.test(readFileSync(file, "utf-8")))) {
  console.log("  ✅ Сторонніх шрифтових origin немає");
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
  } else {
    console.log("  ✅ devDependencies порожні");
  }

  // package-lock.json обов'язковий при наявності package.json
  if (!existsSync(join(resolve("."), "package-lock.json"))) {
    console.log("  ❌ package-lock.json відсутній (TECH_STANDARDS §2)");
    depErrors++;
    totalErrors++;
  }

  // CI-інструменти ізольовані в окремому workspace, не в root dependencies.
  const toolsDir = join(resolve("."), "scripts", "tools");
  const toolsPkgPath = join(toolsDir, "package.json");
  const toolsLockPath = join(toolsDir, "package-lock.json");
  if (!existsSync(toolsPkgPath)) {
    console.log("  ❌ scripts/tools/package.json відсутній");
    depErrors++;
    totalErrors++;
  } else {
    const toolsPkg = JSON.parse(readFileSync(toolsPkgPath, "utf-8"));
    const toolsDeps = Object.entries(toolsPkg.dependencies || {});
    for (const [name, range] of toolsDeps) {
      if (typeof range !== "string" || /[\^~>=*]|\s-\s|latest|next/.test(range)) {
        console.log(`  ❌ scripts/tools/${name}: «${range}» — версія має бути точною`);
        depErrors++;
        totalErrors++;
      }
    }
    if (!existsSync(toolsLockPath)) {
      console.log("  ❌ scripts/tools/package-lock.json відсутній");
      depErrors++;
      totalErrors++;
    }
  }

  if (depErrors === 0) {
    console.log(`  ✅ Залежності: ${deps.length} (${deps.join(", ") || "немає"}), точні версії, lock на місці`);
  }
}
console.log("");

// 7с-а. Pa11y покриває кожен HTML-файл build — F-13a.
console.log("--- 7с-а. Покриття Pa11y ---");
const pa11yUrlsFile = process.env.PA11Y_URLS_FILE
  ? resolve(process.env.PA11Y_URLS_FILE)
  : null;
if (!pa11yUrlsFile) {
  console.log("  ℹ️  pa11y-urls.json не передано; перевірку виконає CI після генерації списку");
} else if (!existsSync(pa11yUrlsFile)) {
  console.log(`  ❌ Файл URL-списку Pa11y відсутній: ${pa11yUrlsFile}`);
  totalErrors++;
} else if (!existsSync(distDir)) {
  console.log(`  ❌ dist відсутній: ${distDir}`);
  totalErrors++;
} else {
  try {
    const pa11yConfig = JSON.parse(readFileSync(pa11yUrlsFile, "utf-8"));
    const htmlCount = walkDir(distDir).filter((file) => file.endsWith(".html")).length;
    const urlCount = Array.isArray(pa11yConfig.urls) ? pa11yConfig.urls.length : -1;
    if (urlCount !== htmlCount) {
      console.log(`  ❌ Pa11y URL: ${urlCount}; HTML у dist: ${htmlCount}`);
      totalErrors++;
    } else {
      console.log(`  ✅ Pa11y покриває ${urlCount} URL для ${htmlCount} HTML-файлів`);
    }
  } catch (error) {
    console.log(`  ❌ pa11y-urls.json невалідний: ${error.message}`);
    totalErrors++;
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

    const requiredIcons = [
      /<link\b(?=[^>]*\brel=["']icon["'])(?=[^>]*\bhref=["']\/favicon\.svg["'])[^>]*>/i,
      /<link\b(?=[^>]*\brel=["']icon["'])(?=[^>]*\bhref=["']\/favicon\.ico["'])[^>]*>/i,
      /<link\b(?=[^>]*\brel=["']apple-touch-icon["'])(?=[^>]*\bhref=["']\/apple-touch-icon\.png["'])[^>]*>/i,
      /<link\b(?=[^>]*\brel=["']manifest["'])(?=[^>]*\bhref=["']\/site\.webmanifest["'])[^>]*>/i,
    ];
    if (requiredIcons.some((re) => !re.test(head))) {
      console.log(`  ❌ ${rel} — неповний набір посилань на favicon/manifest`);
      headErrors++;
      totalErrors++;
    }

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
      // JSON-LD — машинні метадані, не видимий UI (перевірка окремо в секції 7о).
      text = text.replace(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "");
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

    // sections_desc: кожен із дев'яти розділів має непорожній опис в ОБОХ мовах.
    // Бага 2026-11-06: заміна словника цілком (6 ключів замість 9) дала порожні
    // «Практика — » на обидвох мовах; парність це не ловить — зникнення симетричне.
    const SECTIONS = ["manifest", "practice", "cemetery", "blog", "poetry", "nichlyst", "now", "colophon", "contact"];
    if (ukObj && enObj) {
      let descErrors = 0;
      for (const [name, dict] of [["uk.json", ukObj], ["en.json", enObj]]) {
        const sd = (dict.home || {}).sections_desc || {};
        for (const s of SECTIONS) {
          if (!sd[s]) {
            console.log(`  ❌ home.sections_desc (${name}): немає опису «${s}» або він порожній`);
            descErrors++;
          }
        }
      }
      totalErrors += descErrors;
      if (descErrors === 0) console.log("  ✅ sections_desc: 9 розділів × 2 мови — усі описи на місці");
    }

    // Voice-lint F17: позиціонування сайту не називає вузол портфоліо.
    for (const [name, dict] of [["uk.json", ukObj], ["en.json", enObj]]) {
      const title = dict?.site?.title || "";
      if (/\bпортфоліо\b|\bportfolio\b/i.test(title)) {
        console.log(`  ❌ voice-lint ${name}: site.title містить заборонене позиціонування «${title}»`);
        totalErrors++;
      }
    }
    if (!/\bпортфоліо\b|\bportfolio\b/i.test(ukObj?.site?.title || "") &&
        !/\bпортфоліо\b|\bportfolio\b/i.test(enObj?.site?.title || "")) {
      console.log("  ✅ voice-lint: site.title не містить «портфоліо» / «portfolio»");
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
    // Імена та шляхи мають бути в одному ШІ-блоці, а не в User-agent: *.
    const aiGroup = robots.split("# --- Решта краулерів")[0];
    for (const bot of ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "Claude-User"]) {
      if (!aiGroup.includes(`User-agent: ${bot}`)) {
        console.log(`  ❌ robots.txt: ШІ-група не містить User-agent: ${bot}`);
        policyErrors++;
        totalErrors++;
      }
    }
    const disallows = ["/poetry/", "/blog/", "/en/poetry/", "/en/blog/", "/feed.xml", "/en/feed.xml"];
    for (const d of disallows) {
      if (!aiGroup.includes(`Disallow: ${d}`)) {
        console.log(`  ❌ robots.txt: ШІ-група не містить «Disallow: ${d}»`);
        policyErrors++;
        totalErrors++;
      }
    }
  }

  if (!existsSync(headersPath)) {
      console.log("  ❌ static/root/_headers відсутній (декларативна політика noai, PLAN 122)");
    policyErrors++;
    totalErrors++;
  } else {
    const headers = readFileSync(headersPath, "utf-8");
    const cacheRules = [
      [/\/styles\/\*\s+Cache-Control:\s*public,\s*max-age=31536000,\s*immutable/m, "fingerprinted styles: one-year immutable cache"],
      [/\/og\/\*\s+Cache-Control:\s*public,\s*max-age=86400/m, "OG assets: one-day cache"],
    ];
    for (const [pattern, label] of cacheRules) {
      if (!pattern.test(headers)) {
        console.log(`  ❌ _headers: немає правила кешування ${label}`);
        policyErrors++;
        totalErrors++;
      }
    }
    if (!headers.includes("X-Robots-Tag: noai")) {
      console.log("  ❌ _headers: немає X-Robots-Tag: noai");
      policyErrors++;
      totalErrors++;
    }
    // Примус тих самих шляхів, що й robots.txt (RSS теж містить повні тексти).
    for (const p of ["/poetry/*", "/blog/*", "/en/poetry/*", "/en/blog/*", "/feed.xml", "/en/feed.xml"]) {
      const block = headers.split(/\n(?=\S)/).find((section) => section.startsWith(p));
      if (!block || !block.includes("X-Robots-Tag: noai, noimageai")) {
        console.log(`  ❌ _headers: немає секції ${p} з X-Robots-Tag: noai, noimageai`);
        policyErrors++;
        totalErrors++;
      }
    }

    // Заголовки безпеки в секції /* (PLAN 160, ARCHITECTURE §9)
    const secStar = headers.split(/\n(?=\S)/).find((s) => s.startsWith("/*"));
    if (!secStar) {
      console.log("  ❌ _headers: немає секції /* (заголовки безпеки, PLAN 160)");
      policyErrors++;
      totalErrors++;
    } else {
      const block = secStar;
      const required = [
        ["Content-Security-Policy:", "CSP"],
        ["default-src 'self'", "CSP default-src 'self'"],
        ["script-src 'none'", "CSP script-src 'none'"],
        ["object-src 'none'", "CSP object-src 'none'"],
        ["frame-ancestors 'none'", "CSP frame-ancestors 'none'"],
        ["Strict-Transport-Security:", "HSTS"],
        ["Referrer-Policy:", "Referrer-Policy"],
        ["Permissions-Policy:", "Permissions-Policy"],
        ["X-Content-Type-Options: nosniff", "X-Content-Type-Options"],
        ["X-Frame-Options: DENY", "X-Frame-Options"],
      ];
      for (const [needle, label] of required) {
        if (!block.includes(needle)) {
          console.log(`  ❌ _headers /*: немає ${label} (PLAN 160)`);
          policyErrors++;
          totalErrors++;
        }
      }
    }

    const faviconPath = join(distDir, "favicon.svg");
    const builtHeadersPath = join(distDir, "_headers");
    if (!existsSync(faviconPath) || !existsSync(builtHeadersPath)) {
      console.log("  ❌ CSP favicon: dist/favicon.svg або dist/_headers відсутній");
      policyErrors++;
      totalErrors++;
    } else {
      const faviconStyle = readFileSync(faviconPath, "utf-8").match(/<style>([\s\S]*?)<\/style>/)?.[1];
      const builtHeaders = readFileSync(builtHeadersPath, "utf-8");
      const expectedHash = faviconStyle === undefined
        ? ""
        : `'sha256-${createHash("sha256").update(faviconStyle).digest("base64")}'`;
      const styleSource = builtHeaders.match(/style-src\s+([^;]+)/)?.[1]?.trim() || "";
      if (!expectedHash || styleSource !== `'self' ${expectedHash}`) {
        console.log(`  ❌ CSP favicon: style-src не відповідає поточному favicon.svg (очікується ${expectedHash || "inline style hash"})`);
        policyErrors++;
        totalErrors++;
      } else {
        console.log("  ✅ CSP favicon: hash inline-стилю відповідає favicon.svg");
      }
    }

    if (!headers.includes("Strict-Transport-Security: max-age=31536000; includeSubDomains")
        || headers.includes("Strict-Transport-Security: max-age=31536000; includeSubDomains; preload")) {
      console.log("  ❌ _headers: HSTS має містити includeSubDomains без preload");
      policyErrors++;
      totalErrors++;
    }
    if (!headers.includes("Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()")) {
      console.log("  ❌ _headers: Permissions-Policy не блокує interest-cohort і browsing-topics");
      policyErrors++;
      totalErrors++;
    }

    const securityPath = join(distDir, ".well-known", "security.txt");
    if (!existsSync(securityPath)) {
      console.log("  ❌ /.well-known/security.txt відсутній");
      policyErrors++;
      totalErrors++;
    } else {
      const security = readFileSync(securityPath, "utf-8");
      const securityLines = security.trimEnd().split("\n");
      const requiredSecurity = [
        /^Contact:\s+mailto:\S+$/m,
        /^Expires:\s+\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/m,
        /^Preferred-Languages:\s+uk,\s*en$/m,
      ];
      if (securityLines.length !== 10 || requiredSecurity.some((pattern) => !pattern.test(security))) {
        console.log("  ❌ security.txt: очікуються 10 рядків, Contact, Expires і Preferred-Languages");
        policyErrors++;
        totalErrors++;
      } else {
        console.log("  ✅ security.txt: 10 рядків, Contact/Expires/Preferred-Languages на місці");
      }
    }

    // noindex для не-production (PLAN 162): логіка у scripts/postbuild.mjs
    const postbuildPath = join(resolve("scripts"), "postbuild.mjs");
    if (!existsSync(postbuildPath)) {
      console.log("  ❌ scripts/postbuild.mjs відсутній (noindex для не-production, PLAN 162)");
      policyErrors++;
      totalErrors++;
    } else {
      const pb = readFileSync(postbuildPath, "utf-8");
      if (!pb.includes("process.env.CONTEXT") || !pb.includes("X-Robots-Tag: noindex")) {
        console.log("  ❌ postbuild.mjs: немає noindex за CONTEXT для не-production (PLAN 162)");
        policyErrors++;
        totalErrors++;
      }
    }
  }

    // Парність noindex: файли контенту з noindex та обидві локалізовані 404
    // мають по одному robots-meta, який рендерить base.njk.
  {
    const contentFiles = walkDir(resolve("content")).filter((f) => f.endsWith(".md"));
    let noindexData = 0;
    for (const f of contentFiles) {
      const fm = readFileSync(f, "utf-8").match(/^---\n([\s\S]*?)\n---/);
      if (fm && /^noindex:\s*true\s*$/m.test(fm[1])) noindexData++;
    }
    let robotsMeta = 0;
    for (const f of walkDir(distDir).filter((f) => f.endsWith(".html"))) {
      robotsMeta += [...readFileSync(f, "utf-8").matchAll(/<meta name="robots"/g)].length;
    }
    const notFoundPages = ["404.html", "en/404.html"].filter((file) =>
      existsSync(join(distDir, file)),
    ).length;
    const ukPosts = walkDir(resolve("content/uk"))
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.slice(resolve("content/uk").length + 1))
      .filter((rel) => /^(blog|practice|poetry|cemetery)\/[^/]+\.md$/.test(rel));
    const enPosts = new Set(
      walkDir(resolve("content/en"))
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.slice(resolve("content/en").length + 1))
    );
    const generatedStubs = ukPosts.filter((rel) => {
      const source = join(resolve("content/uk"), rel);
      const frontmatter = readFileSync(source, "utf-8").match(/^---\n([\s\S]*?)\n---/);
      return !(frontmatter && /^draft:\s*true\s*$/m.test(frontmatter[1])) && !enPosts.has(rel);
    }).length;
    const expected = noindexData + generatedStubs + notFoundPages;
    if (expected !== robotsMeta) {
      console.log(`  ❌ noindex-парність: очікувано ${expected} (${noindexData} content + ${generatedStubs} stub + ${notFoundPages} 404) ↔ знайдено ${robotsMeta} robots-meta`);
      policyErrors++;
      totalErrors++;
    } else if (noindexData > 0 || generatedStubs > 0) {
      console.log(`  ✅ noindex-парність: ${noindexData} content + ${generatedStubs} stub + ${notFoundPages} 404 ↔ ${robotsMeta} robots-meta`);
    }
  }

  if (policyErrors === 0) {
    console.log("  ✅ Політика ШІ: robots.txt (16 ботів, 6 Disallow, Sitemap) + _headers (X-Robots-Tag для текстів і фідів) + noindex не-production (postbuild, PLAN 162)");
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
    const channelTitles = new Map();
    const feeds = [
      { path: join(distDir, "feed.xml"), lang: "uk", root: "https://koztechie.fyi/" },
      { path: join(distDir, "en", "feed.xml"), lang: "en", root: "https://koztechie.fyi/en/" },
    ];
    const stringsData = {};
    for (const lang of ["uk", "en"]) {
      const file = join(resolve("src/_data/strings"), `${lang}.json`);
      stringsData[lang] = existsSync(file) ? JSON.parse(readFileSync(file, "utf-8")) : {};
    }
    const feedTemplate = readFileSync(resolve("src/feed.njk"), "utf-8");
    const configSource = readFileSync(resolve("eleventy.config.js"), "utf-8");
    if (!/\{\{\s*item\.templateContent\s*\|\s*absolutize\s*\|\s*cdataSafe\s*\|\s*safe\s*\}\}/.test(feedTemplate)) {
      feedErrors("feed.njk: absolutize → cdataSafe не застосовані до item.templateContent");
    }
    if (!configSource.includes('addFilter("cdataSafe"') || !configSource.includes('replace(/\\]\\]>/g')) {
      feedErrors("eleventy.config.js: фільтр cdataSafe відсутній або не санітизує ]]>");
    }
    if (!configSource.includes('addFilter("absolutize"')
      || !configSource.includes('replace(/(href|src)="\\/(?!\\/)')) {
      feedErrors("eleventy.config.js: фільтр absolutize відсутній або має неправильний патерн");
    }

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
      if (!/\bxmlns:atom="http:\/\/www\.w3\.org\/2005\/Atom"/.test(xml)) feedErrors(`${label}: немає namespace Atom`);
      if ((xml.match(/<rss\b/g) || []).length !== (xml.match(/<\/rss>/g) || []).length) feedErrors(`${label} незбалансований <rss>`);
      if ((xml.match(/<channel>/g) || []).length !== (xml.match(/<\/channel>/g) || []).length) feedErrors(`${label} незбалансований <channel>`);
      const openItems = (xml.match(/<item>/g) || []).length;
      const closeItems = (xml.match(/<\/item>/g) || []).length;
      if (openItems !== closeItems) feedErrors(`${label}: незбалансовані <item> (${openItems} ≠ ${closeItems})`);
      if ((xml.match(/<!\[CDATA\[/g) || []).length !== (xml.match(/\]\]>/g) || []).length) feedErrors(`${label} незакритий CDATA`);
      const cdataBlocks = [...xml.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)].map((match) => match[1]);
      for (const [index, block] of cdataBlocks.entries()) {
        if (/(?:href|src)="\/(?!\/)/.test(block)) {
          feedErrors(`${label}: G-05 CDATA ${index + 1} містить відносний href/src`);
        }
      }

      // Канал: обов'язкові за §17.3
      const channel = xml.match(/<channel>([\s\S]*?)<\/channel>/)?.[1] || "";
      const channelItem = channel.indexOf("<item>");
      const channelHead = channelItem >= 0 ? channel.slice(0, channelItem) : channel;
      const channelTitle = channelHead.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
      if (!channelTitle) feedErrors(`${label}: канал без <title>`);
      else channelTitles.set(feed.lang, channelTitle);
      if (!/<link>https:\/\/koztechie\.fyi[^<]*<\/link>/.test(channelHead)) feedErrors(`${label}: канал без <link>`);
      const channelDescription = channelHead.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.trim();
      if (!channelDescription) feedErrors(`${label}: канал без <description>`);
      else if (channelDescription !== stringsData[feed.lang]?.site?.title) {
        feedErrors(`${label}: description не збігається з site.title`);
      }
      if (!new RegExp(`<language>${feed.lang}<\\/language>`).test(channelHead)) feedErrors(`${label}: <language> ≠ ${feed.lang}`);
      const chanLink = channelHead.match(/<link>([^<]*)<\/link>/)?.[1];
      if (chanLink !== feed.root) feedErrors(`${label}: link каналу «${chanLink}» ≠ «${feed.root}»`);
      const selfUrl = `https://koztechie.fyi${label}`;
      const atomSelf = channelHead.match(/<atom:link\b([^>]*)\/>/)?.[1] || "";
      if (!new RegExp(`\\bhref="${selfUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(atomSelf) ||
          !/\brel="self"/.test(atomSelf) ||
          !/\btype="application\/rss\+xml"/.test(atomSelf)) {
        feedErrors(`${label}: atom:link rel="self" відсутній або некоректний`);
      }

      const lastBuildDate = channelHead.match(/<lastBuildDate>([^<]*)<\/lastBuildDate>/)?.[1]?.trim();
      if (!lastBuildDate || !RFC822.test(lastBuildDate)) {
        feedErrors(`${label}: lastBuildDate відсутній або не RFC 822`);
      }

      // Items (§30.4)
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
      totalItems += items.length;
      if (items.length === 0) console.log(`  ⚠️  ${label}: 0 записів (контент ще не створено)`);
      if (lastBuildDate && items.length) {
        const latestPub = Math.max(...items.map((it) => Date.parse(it.match(/<pubDate>([^<]*)<\/pubDate>/)?.[1] || "")));
        if (Number.isFinite(latestPub) && Date.parse(lastBuildDate) < latestPub) {
          feedErrors(`${label}: lastBuildDate старіший за найновіший pubDate`);
        }
      }

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

    if (channelTitles.size === 2 && channelTitles.get("uk") === channelTitles.get("en")) {
      feedErrors(`назви uk/en каналів однакові: «${channelTitles.get("uk")}»`);
    }

    const headersFile = join(resolve("static/root"), "_headers");
    if (!existsSync(headersFile)) {
      feedErrors("static/root/_headers відсутній — MIME RSS не задано");
    } else {
      const headers = readFileSync(headersFile, "utf-8");
      for (const path of ["/feed.xml", "/en/feed.xml"]) {
        const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const mimeRule = new RegExp(`^${escapedPath}\\s*\\n\\s+Content-Type: application/rss\\+xml; charset=utf-8\\s*$`, "m");
        if (!mimeRule.test(headers)) feedErrors(`${path}: у _headers має бути Content-Type: application/rss+xml; charset=utf-8`);
      }
    }
    if (totalErrors === startErrors) {
      console.log(`  ✅ Фіди валідні: 2 канали (uk/en), ${totalItems} записів, self-link, MIME та build date`);
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

// 7л-б. URL-и основної навігації шапки й підвалу не перетинаються (§4).
console.log("--- 7л-б. Розділення навігації шапки та підвалу ---");
{
  let navErrors = 0;
  const htmlFiles = walkDir(distDir).filter((file) => file.endsWith(".html"));
  const navHrefs = (html, className) => {
    const match = html.match(
      new RegExp(`<nav\\b[^>]*class="${className}"[^>]*>([\\s\\S]*?)<\\/nav>`)
    );
    if (!match) return null;
    return [...match[1].matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)]
      .map(([, href]) => href)
      .filter((href) => href.startsWith("/") && !href.startsWith("//"))
      .map((href) => {
        const path = href.split(/[?#]/, 1)[0];
        const ukPath = path === "/en/" ? "/" : path.startsWith("/en/") ? path.slice(3) : path;
        return ukPath.endsWith("/") ? ukPath : `${ukPath}/`;
      });
  };
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf-8");
    const header = navHrefs(html, "site-nav");
    const footer = navHrefs(html, "footer-nav");
    const rel = file.slice(distDir.length + 1);
    if (!header || !footer) {
      console.log(`  ❌ ${rel}: відсутня шапкова або підвальна навігація`);
      navErrors++;
      continue;
    }
    const duplicates = [...new Set(header.filter((href) => footer.includes(href)))];
    if (duplicates.length) {
      console.log(`  ❌ ${rel}: URL-и є в обох навігаціях: ${duplicates.join(", ")}`);
      navErrors++;
    }
  }
  if (navErrors) totalErrors += navErrors;
  else console.log(`  ✅ ${htmlFiles.length} HTML-файлів: URL-и шапки й підвалу не перетинаються`);
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
      const other = inner.match(/<a\s+href="([^"]*)"\s+hreflang="(uk|en)"\s+lang="([^"]*)"[^>]*>([^<]*)<\/a>/);
      if (!other) {
        fail(rel, "немає лінка іншої мови");
      } else {
        const [, href, hl, linkLang, text] = other;
        if (hl === pageLang) fail(rel, `hreflang лінка «${hl}» збігається з мовою сторінки`);
        if (linkLang !== hl) fail(rel, `lang лінка «${linkLang}» ≠ hreflang «${hl}»`);
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

// 7л-а. Автоматичні заглушки неперекладених записів — DECISIONS §35.2.
// Кожен опублікований uk-запис без en-файла має /en/.../index.html з noindex.
console.log("--- 7л-а. Заглушки перекладів ---");
{
  const contentRoot = resolve("content");
  const ukRoot = join(contentRoot, "uk");
  const enRoot = join(contentRoot, "en");
  const sections = new Set(["blog", "practice", "poetry", "cemetery"]);
  const ukFiles = existsSync(ukRoot)
    ? walkDir(ukRoot).filter((file) => {
        const rel = file.slice(ukRoot.length + 1).split("/");
        return file.endsWith(".md") && rel.length === 2 && sections.has(rel[0]);
      })
    : [];
  const enFiles = new Set(
    existsSync(enRoot)
      ? walkDir(enRoot)
          .filter((file) => file.endsWith(".md"))
          .map((file) => file.slice(enRoot.length + 1))
      : []
  );
  let stubErrors = 0;
  const fail = (message) => {
    console.log(`  ❌ ${message}`);
    stubErrors++;
    totalErrors++;
  };
  const readFrontmatterField = (file, field) => {
    const source = readFileSync(file, "utf-8");
    return source.match(new RegExp(`^${field}:\\s*["']([^"']*)["']`, "m"))?.[1] || "";
  };
  const checkStub = (stubUrl, sourceTitle) => {
    const stubFile = join(distDir, stubUrl.slice(1), "index.html");
    if (!existsSync(stubFile)) {
      fail(`${stubUrl}: немає згенерованої заглушки`);
      return;
    }
    const html = readFileSync(stubFile, "utf-8");
    if (!/<meta\s+name="robots"\s+content="noindex"/i.test(html)) {
      fail(`${stubUrl}: заглушка не має meta robots noindex`);
    }
    if (/<link\s+rel="alternate"\s+hreflang=/i.test(html)) {
      fail(`${stubUrl}: заглушка не повинна містити hreflang у head`);
    }
    const titleMatch = html.match(/<p\s+lang="uk">([\s\S]*?)<\/p>/i);
    if (!titleMatch || titleMatch[1].trim() !== sourceTitle) {
      fail(`${stubUrl}: заглушка не містить український source title`);
    }
    if (!new RegExp(`<a\\b[^>]*href="${stubUrl.slice(3)}"[^>]*hreflang="uk"`, "i").test(html)) {
      fail(`${stubUrl}: посилання на оригінал не має hreflang="uk"`);
    }
  };

  for (const ukFile of ukFiles) {
    const rel = ukFile.slice(ukRoot.length + 1);
    const frontmatter = readFileSync(ukFile, "utf-8").match(/^---\s*\n([\s\S]*?)\n---/);
    if (frontmatter && /^draft:\s*true\s*$/m.test(frontmatter[1])) continue;
    const section = rel.split("/")[0];
    const slug = rel.slice(section.length + 1, -3);
    if (enFiles.has(rel)) continue;
    const stubUrl = `/en/${section}/${slug}/`;
    checkStub(stubUrl, readFrontmatterField(ukFile, "title"));
  }

  const manualStubFiles = existsSync(enRoot)
    ? walkDir(enRoot).filter((file) => {
        if (!file.endsWith(".md")) return false;
        const source = readFileSync(file, "utf-8");
        return /^layout:\s*stub\.njk\s*$/m.test(source);
      })
    : [];
  for (const enFile of manualStubFiles) {
    const rel = enFile.slice(enRoot.length + 1);
    const parts = rel.split("/");
    const slug = parts[parts.length - 1].slice(0, -3);
    const stubUrl = `/en/${parts[0]}/${slug}/`;
    checkStub(stubUrl, readFrontmatterField(enFile, "title_uk"));
  }

  for (const section of sections) {
    const ukSectionFiles = ukFiles.filter((file) => file.slice(ukRoot.length + 1).split("/")[0] === section);
    const ukSectionCount = ukSectionFiles.filter((file) => {
      const frontmatter = readFileSync(file, "utf-8").match(/^---\s*\n([\s\S]*?)\n---/);
      return frontmatter && !/^draft:\s*true\s*$/m.test(frontmatter[1]);
    }).length;
    if (ukSectionCount === 0) continue;

    const enIndex = join(distDir, "en", section, "index.html");
    if (!existsSync(enIndex)) {
      fail(`/en/${section}/: відсутній EN-індекс для перевірки pointer`);
      continue;
    }
    const html = readFileSync(enIndex, "utf-8");
    if (/<p\s+class="list-empty">/i.test(html) &&
        !new RegExp(`<a\\b[^>]*href="/${section}/"[^>]*hreflang="uk"`, "i").test(html)) {
      fail(`/en/${section}/: порожній EN-індекс без pointer на український розділ`);
    }
  }

  if (stubErrors === 0) {
    console.log(`  ✅ Перевірено ${ukFiles.length} українських записів: stub-URL повні, noindex присутній`);
  }
}
console.log("");

// 7т. hreflang у sitemap — F30.
// Кожна sitemap-пара має взаємні uk/en entries і ті самі цілі, що HTML head.
console.log("--- 7т. hreflang у sitemap ---");
{
  let sitemapErrors = 0;
  const fail = (msg) => {
    console.log(`  ❌ ${msg}`);
    sitemapErrors++;
    totalErrors++;
  };
  const sitemapFile = join(distDir, "sitemap.xml");

  if (!existsSync(sitemapFile)) {
    fail("dist/sitemap.xml відсутній");
  } else {
    const origin = "https://koztechie.fyi";
    const xml = readFileSync(sitemapFile, "utf-8");
    if (!/xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/.test(xml)) {
      fail("sitemap.xml не оголошує xmlns:xhtml");
    }

    const entries = new Map();
    for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
      const block = match[1];
      const loc = (block.match(/<loc>([^<]+)<\/loc>/) || [])[1];
      if (!loc) {
        fail("sitemap entry без loc");
        continue;
      }
      const links = {};
      for (const link of block.matchAll(/<xhtml:link\b([^>]*)\/?>/g)) {
        const attrs = Object.fromEntries(
          [...link[1].matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)].map(([, key, value]) => [key, value])
        );
        if (attrs.hreflang) links[attrs.hreflang] = attrs.href;
      }
      if (entries.has(loc)) fail(`дубль sitemap loc: ${loc}`);
      entries.set(loc, links);
    }

    const htmlLinks = (html) => {
      const links = {};
      for (const link of html.matchAll(/<link\b([^>]*)>/gi)) {
        const attrs = Object.fromEntries(
          [...link[1].matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)].map(([, key, value]) => [key.toLowerCase(), value])
        );
        if (attrs.rel === "alternate" && attrs.hreflang) links[attrs.hreflang] = attrs.href;
      }
      return links;
    };

    const publicPagesFile = join(distDir, "pages.json");
    let publicPages = [];
    if (!existsSync(publicPagesFile)) {
      fail("dist/pages.json відсутній");
    } else {
      try {
        publicPages = JSON.parse(readFileSync(publicPagesFile, "utf-8"));
        if (!Array.isArray(publicPages) || publicPages.some((item) => !item || typeof item.url !== "string")) {
          fail("dist/pages.json має містити масив об'єктів з url");
          publicPages = [];
        }
      } catch {
        fail("dist/pages.json містить невалідний JSON");
      }
    }
    const publicUrls = new Set(publicPages.map((item) => origin + item.url));
    if (entries.size !== publicPages.length) {
      fail(`sitemap/publicPages: ${entries.size} URL у sitemap ↔ ${publicPages.length} publicPages`);
    } else if ([...entries.keys()].some((url) => !publicUrls.has(url))) {
      fail("sitemap/publicPages: URL-склад не збігається");
    }

    for (const [loc, links] of entries) {
      const url = new URL(loc);
      const raw = url.pathname;
      const isEn = raw.indexOf("/en/") === 0;
      const ukPath = isEn ? raw.slice(3) : raw;
      const enPath = "/en" + ukPath;
      const expected = {};
      const alternateFiles = {
        uk: ukPath === "/"
          ? join(distDir, "index.html")
          : join(distDir, ukPath.slice(1), "index.html"),
        en: enPath === "/en/"
          ? join(distDir, "en", "index.html")
          : join(distDir, enPath.slice(1), "index.html"),
      };
      for (const [lang, file] of Object.entries(alternateFiles)) {
        if (!existsSync(file)) continue;
        const html = readFileSync(file, "utf-8");
        if (!/<meta\s+name="robots"\s+content="noindex"/i.test(html)) {
          expected[lang] = origin + (lang === "uk" ? ukPath : enPath);
        }
      }
      if (expected.uk) expected["x-default"] = expected.uk;

      for (const lang of ["uk", "en", "x-default"]) {
        if (links[lang] !== expected[lang]) {
          fail(`${raw}: sitemap hreflang=${lang} має «${links[lang] || "відсутній"}», очікується «${expected[lang] || "відсутній"}»`);
        }
      }

      const counterpart = expected.en ? entries.get(expected.en) : null;
      if (expected.en && !counterpart) fail(`${raw}: відсутній взаємний sitemap entry ${expected.en}`);
      else if (counterpart && (counterpart.uk !== expected.uk || counterpart.en !== expected.en)) {
        fail(`${raw}: взаємний sitemap entry не містить тієї самої uk/en пари`);
      }

      const htmlFile = raw === "/"
        ? join(distDir, "index.html")
        : join(distDir, raw.slice(1), "index.html");
      if (!existsSync(htmlFile)) {
        fail(`${raw}: HTML-сторінка для порівняння відсутня`);
        continue;
      }
      const html = readFileSync(htmlFile, "utf-8");
      if (/<meta\s+name="robots"\s+content="noindex"/i.test(html)) {
        fail(`${raw}: noindex-сторінка потрапила до sitemap`);
      }
      const rendered = htmlLinks(html);
      for (const lang of ["uk", "en", "x-default"]) {
        if (rendered[lang] !== expected[lang]) {
          fail(`${raw}: HTML hreflang=${lang} має «${rendered[lang] || "відсутній"}», очікується «${expected[lang] || "відсутній"}»`);
        }
      }
      if (Object.keys(links).sort().join(",") !== Object.keys(rendered).sort().join(",")) {
        fail(`${raw}: набір sitemap hreflang не збігається з HTML`);
      }
    }

    if (sitemapErrors === 0) {
      console.log(`  ✅ ${entries.size} sitemap entries: publicPages і доступні hreflang-пари збігаються з HTML`);
    }
  }
}
console.log("");

// 7у. Унікальні доступні імена посилань — WCAG 2.4.4/2.5.3, F-01.
console.log("--- 7у. Імена посилань не дезамбіґуються однаковим текстом ---");
let linkNameErrors = 0;
const linkNameHtmlFiles = walkDir(distDir).filter((file) => file.endsWith(".html"));
for (const file of linkNameHtmlFiles) {
  const rel = file.replace(distDir + "/", "");
  const html = readFileSync(file, "utf-8");
  const names = new Map();
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = match[1];
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const ariaLabel = attrs.match(/\baria-label\s*=\s*["']([^"']+)["']/i)?.[1];
    const text = match[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\s+/g, " ")
      .trim();
    const accessibleName = (ariaLabel ?? text).replace(/\s+/g, " ").trim();
    if (!accessibleName) continue;
    if (!names.has(accessibleName)) names.set(accessibleName, new Set());
    names.get(accessibleName).add(href);
  }
  for (const [name, hrefs] of names) {
    if (hrefs.size > 1) {
      console.log(`  ❌ ${rel}: «${name}» має кілька href: ${[...hrefs].join(", ")}`);
      linkNameErrors++;
      totalErrors++;
    }
  }
}
if (linkNameErrors === 0) {
  console.log(`  ✅ Усі доступні імена посилань однозначні (${linkNameHtmlFiles.length} HTML-файлів)`);
}

// 7м. Таб-навігація — крок 134. TECH_STANDARDS §9; фокус за KZTCH_DS §02
// (3px, var(--focus)). AGENTS.md §5 (видимий
// :focus, клавіатурна навігація).
console.log("--- 7м. Таб-навігація ---");
{
  let tbErrors = 0;
  const fail = (msg) => {
    console.log(`  ❌ ${msg}`);
    tbErrors++;
    totalErrors++;
  };

  // 1. Глобальний :focus-visible з чітким контуром.
  const cssFiles = walkDir(stylesDir).filter((f) => f.endsWith(".css"));
  const cssAll = cssFiles.map((f) => readFileSync(f, "utf-8")).join("\n");
  if (!/\.?[a-z-]*:focus-visible[^{]*\{[^}]*outline\s*:\s*3px\s+solid\s+var\(--focus\)/.test(cssAll)) {
    fail("CSS: немає правила :focus-visible з outline 3px solid var(--focus)");
  }
  // 2. Ніхто не ховає фокус
  const cssWithoutMainFocusReset = cssAll.replace(/main:focus\b\s*\{[^}]*\}/g, "");
  const hidden = cssWithoutMainFocusReset.match(/outline\s*:\s*(none|0)\b/g);
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
      console.log(`  ✅ Таб-навігація: видимий 3px focus, без tabindex/href-прогалин (${htmlFiles.length} сторінок)`);
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
      // main id і фокусована ціль skip-link
      const mainTag = doc.match(/<main\b[^>]*>/i)?.[0] || "";
      if (!/\bid="main"/i.test(mainTag)) {
        fail(`${rel}: <main> без id="main" (ціль #main не існує)`);
      }
      if (!/\btabindex\s*=\s*"-1"/i.test(mainTag)) {
        fail(`${rel}: <main id="main"> без tabindex="-1" (skip-link не фокусується на цілі)`);
      }

      const tableRegions = doc.match(/<div\s+class="table-scroll"[^>]*>\s*<table\b/gi) || [];
      const tables = doc.match(/<table\b[^>]*>/gi) || [];
      const expectedTableLabel = rel.startsWith("en/") ? "Table (scrollable)" : "Таблиця (прокрутка)";
      const wrongTableRegions = tableRegions.filter(
        (tag) => !new RegExp(`\\btabindex="0"[^>]*\\brole="region"[^>]*\\baria-label="${expectedTableLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(tag)
      );
      if (tables.length !== tableRegions.length || wrongTableRegions.length > 0) {
        fail(`${rel}: кожна <table> має language-aware .table-scroll[tabindex="0"][role="region"] з aria-label «${expectedTableLabel}»`);
      }
      const poetryBodies = doc.match(/<div\s+class="entry-body poetry">[\s\S]*?<\/div>/gi) || [];
      const invalidPoetryBodies = poetryBodies.filter(
        (body) => !/^<div\s+class="entry-body poetry"><p\b/i.test(body)
      );
      if (invalidPoetryBodies.length > 0) {
        fail(`${rel}: перша дитина .entry-body.poetry має бути <p> без попереднього whitespace`);
      }
      const thTags = doc.match(/<th\b[^>]*>/gi) || [];
      const invalidTh = thTags.filter((tag) => !/\bscope\s*=\s*["'][^"']+["']/i.test(tag));
      if (invalidTh.length > 0) {
        fail(`${rel}: кожен <th> має атрибут scope`);
      }

      const preTags = doc.match(/<pre\b[^>]*>/gi) || [];
      const expectedCodeLabel = rel.startsWith("en/") ? "Code (scrollable)" : "Код (прокрутка)";
      const invalidPre = preTags.filter(
        (tag) => !/\btabindex\s*=\s*"0"/i.test(tag)
          || !/\brole\s*=\s*"region"/i.test(tag)
          || !/\baria-label\s*=\s*"[^"]+"/i.test(tag)
          || !new RegExp(`\\baria-label="${expectedCodeLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(tag)
      );
      if (invalidPre.length > 0) {
        fail(`${rel}: кожен <pre> має language-aware tabindex="0", role="region" і aria-label «${expectedCodeLabel}»`);
      }
    }
    if (skErrors === 0) {
      console.log(`  ✅ Skip-link: ${htmlFiles.length} сторінок — ціль #main фокусована, таблиці й pre доступні з клавіатури`);
    }
  } else {
    console.log("  ⚠️  dist/ не існує. Пропущено.");
  }
}
console.log("");

// 7о. JSON-LD: формат і основні властивості Person, WebSite, BlogPosting,
// VideoGame та SoftwareApplication.
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
    const siteTitles = {};
    for (const lang of ["uk", "en"]) {
      const file = join(resolve("src/_data/strings"), `${lang}.json`);
      siteTitles[lang] = existsSync(file) ? JSON.parse(readFileSync(file, "utf-8")).site?.title : "";
    }
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
        const htmlLangMatch = content.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i);
        const htmlLang = htmlLangMatch?.[1] || null;
        if (!htmlLang) {
          fail(`${rel}: <html lang> відсутній для перевірки JSON-LD.inLanguage`);
        }
        const graph = Array.isArray(data["@graph"]) ? data["@graph"] : data["@type"] ? [data] : null;
        if (!graph) {
          fail(`${rel}: немає ні @graph, ні @type`);
          continue;
        }

        for (const node of graph) {
          const types = new Set(Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]]);
          if (Object.prototype.hasOwnProperty.call(node, "inLanguage") &&
              (typeof node.inLanguage !== "string" || node.inLanguage !== htmlLang)) {
            fail(`${rel}: JSON-LD.inLanguage «${node.inLanguage}» не відповідає <html lang> «${htmlLang}»`);
          }
          if (types.has("Person")) {
            if (typeof node.name !== "string" || !node.name.trim()) fail(`${rel}: Person.name порожній`);
            if (!/^https:\/\/koztechie\.fyi\//.test(node.url || "")) fail(`${rel}: Person.url відсутній або некоректний`);
            if (node.image !== "https://koztechie.fyi/og/home-v2.png") {
              fail(`${rel}: Person.image ≠ default OG image (очікується https://koztechie.fyi/og/home-v2.png)`);
            }
            if (Object.hasOwn(node, "jobTitle")) fail(`${rel}: Person.jobTitle не має позиціонувати головну як портфоліо`);
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
          if (types.has("WebSite")) {
            if (typeof node.name !== "string" || !node.name.trim()) fail(`${rel}: WebSite.name порожній`);
            if (typeof node.url !== "string" || !/^https:\/\/koztechie\.fyi\//.test(node.url)) {
              fail(`${rel}: WebSite.url ≠ https://koztechie.fyi/ — «${node.url}»`);
            }
            if (typeof node.description !== "string" || !node.description.trim()) {
              fail(`${rel}: WebSite.description порожній`);
            } else if (node.description !== siteTitles[htmlLang]) {
              fail(`${rel}: WebSite.description не збігається з site.title мови ${htmlLang}`);
            }
          }
          if (types.has("BlogPosting")) {
            if (typeof node.headline !== "string" || !node.headline.trim()) fail(`${rel}: BlogPosting.headline порожній`);
            if (typeof node.image !== "string" || !/^https:\/\/koztechie\.fyi\/.+\.png$/.test(node.image)) {
              fail(`${rel}: BlogPosting.image відсутній або некоректний`);
            }
            if (node.publisher?.["@id"] !== "https://koztechie.fyi/#person") {
              fail(`${rel}: BlogPosting.publisher має посилатися на https://koztechie.fyi/#person`);
            }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(node.datePublished || "")) fail(`${rel}: BlogPosting.datePublished не ISO date`);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(node.dateModified || "")) fail(`${rel}: BlogPosting.dateModified не ISO date`);
            if (node.author?.["@type"] !== "Person" || !node.author.name || !node.author.url) {
              fail(`${rel}: BlogPosting.author неповний`);
            }
            if (!["uk", "en"].includes(node.inLanguage)) fail(`${rel}: BlogPosting.inLanguage не uk/en`);
          }
          if (types.has("VideoGame") || types.has("SoftwareApplication")) {
            if (!types.has("VideoGame") || !types.has("SoftwareApplication")) {
              fail(`${rel}: NICHLYST має бути VideoGame і SoftwareApplication`);
            }
            if (node.operatingSystem !== "Android") fail(`${rel}: NICHLYST operatingSystem має бути Android`);
            if (node.applicationCategory !== "GameApplication") fail(`${rel}: NICHLYST applicationCategory має бути GameApplication`);
            if (typeof node.offers?.description !== "string" || !node.offers.description.trim()) {
              fail(`${rel}: NICHLYST Offer не описує модель придбання`);
            }
          }
        }
      }
    }

    if (ldErrors === 0) {
      console.log(`  ✅ JSON-LD валідний: ${blocks} блок(и) у ${htmlFiles.length} HTML — Person/WebSite/BlogPosting/NICHLYST`);
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
      const is404 = rel === "404.html" || rel === "en/404.html";
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

// 7і. Редиректи: саме 301 — PLAN крок 159
console.log("--- 7р. Редиректи: саме 301 ---");
const redirectsPath = join(resolve("."), "static", "root", "_redirects");
if (!existsSync(redirectsPath)) {
  console.log("  ⚠️  static/root/_redirects не існує. Пропущено.");
} else {
  let redirectErrors = 0;
  let redirectRules = 0;
  for (const raw of readFileSync(redirectsPath, "utf-8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    redirectRules++;
    // Звичайні редиректи — 301; локалізована 404-маршрутизація — єдиний 404.
    if (!/\s301!?$/.test(line) && line !== "/en/* /en/404.html 404") {
      console.log(`  ❌ Неприпустимий статус редиректу: «${line}»`);
      redirectErrors++;
    }
  }
  const redirectText = readFileSync(redirectsPath, "utf-8");
  for (const requiredRule of [
    "http://www.koztechie.fyi/* https://koztechie.fyi/:splat 301!",
    "https://www.koztechie.fyi/* https://koztechie.fyi/:splat 301!",
    "http://koztechie.fyi/* https://koztechie.fyi/:splat 301!",
    "https://koztechie.netlify.app/* https://koztechie.fyi/:splat 301!",
  ]) {
    if (!redirectText.split("\n").some((line) => line.trim() === requiredRule)) {
      console.log(`  ❌ Відсутнє правило канонізації www: «${requiredRule}»`);
      redirectErrors++;
    }
  }
  if (redirectRules === 0) {
    console.log("  ⚠️  Жодного правила редиректів у _redirects.");
    totalWarnings++;
  } else if (redirectErrors === 0) {
    console.log(`  ✅ ${redirectRules} правил (_redirects): 301 редиректи та локалізована 404`);
  }

  const redirectLines = readFileSync(redirectsPath, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  const wwwRuleLines = redirectLines
    .filter((line) => /^(https?):\/\/www\.koztechie\.fyi\/\*/.test(line));
  if (wwwRuleLines.length !== 2) {
    console.log(`  ❌ www→apex: очікуються дві scheme rules, знайдено ${wwwRuleLines.length}`);
    redirectErrors++;
  }
  const wwwRules = new Map(
    wwwRuleLines
      .map((line) => {
        const [from, to, status] = line.split(/\s+/);
        return [new URL(from.replace("*", "matrix-path")).protocol, { from, to, status }];
      }),
  );
  const redirectMatrix = [
    ["https:", "/", ""],
    ["https:", "/manifest/", ""],
    ["https:", "/manifest/", "?source=matrix"],
    ["http:", "/", ""],
    ["http:", "/manifest/", ""],
    ["http:", "/manifest/", "?source=matrix"],
  ];
  let matrixPassed = 0;
  for (const [protocol, path, search] of redirectMatrix) {
    const rule = wwwRules.get(protocol);
    const expected = `https://koztechie.fyi${path}${search}`;
    const actual = rule?.to
      .replace(":splat", path.replace(/^\//, "").split("?")[0])
      .concat(search);
    const sourceMatches = rule?.from === `${protocol}//www.koztechie.fyi/*`;
    if (sourceMatches && rule.status === "301!" && actual === expected) {
      matrixPassed++;
    } else {
      console.log(`  ❌ www→apex ${protocol} ${path}${search}: правило не відповідає ${expected}`);
      redirectErrors++;
    }
  }
  console.log(`  ${matrixPassed === redirectMatrix.length ? "✅" : "❌"} www→apex matrix: ${matrixPassed}/${redirectMatrix.length}`);
  totalErrors += redirectErrors;
}
console.log("");

// 7с. Open Graph і X Cards: доступність, зображення та article metadata.
console.log("--- 7с. Open Graph і X Cards ---");
{
  let socialErrors = 0;
  const fail = (msg) => {
    console.log(`  ❌ ${msg}`);
    socialErrors++;
    totalErrors++;
  };

  if (!existsSync(distDir)) {
    console.log("  ⚠️  dist/ не існує. Пропущено.");
  } else {
    const htmlFiles = walkDir(distDir).filter((f) => f.endsWith(".html"));
    for (const file of htmlFiles) {
      const rel = file.slice(distDir.length + 1);
      const html = readFileSync(file, "utf-8");
      const is404 = rel === "404.html" || rel === "en/404.html";
      const metas = new Map();
      for (const match of html.matchAll(/<meta\s+(property|name)="([^"]+)"\s+content="([^"]*)"/g)) {
        const key = `${match[1]}:${match[2]}`;
        metas.set(key, (metas.get(key) || []).concat(match[3]));
      }
      if (is404) {
        if ([...metas.keys()].some((key) => key.startsWith("property:og:") || key.startsWith("name:twitter:"))) {
          fail(`${rel}: 404 не має містити OG чи X Card метадані`);
        }
        continue;
      }
      for (const key of [
        "property:og:type",
        "property:og:title",
        "property:og:description",
        "property:og:image",
        "property:og:image:alt",
        "name:twitter:card",
        "name:twitter:title",
        "name:twitter:image",
      ]) {
        if (!metas.get(key)?.[0]) fail(`${rel}: немає ${key}`);
      }
      if (metas.get("name:twitter:card")?.[0] !== "summary_large_image") {
        fail(`${rel}: twitter:card має бути summary_large_image`);
      }
      const imageUrl = metas.get("property:og:image")?.[0];
      if (imageUrl) {
        try {
          const imagePath = new URL(imageUrl).pathname.replace(/^\/+/, "");
          const imageFile = join(distDir, imagePath);
          if (!existsSync(imageFile)) {
            fail(`${rel}: OG-зображення не знайдено — ${imagePath}`);
          } else {
            const image = readFileSync(imageFile);
            if (image.toString("ascii", 1, 4) !== "PNG" ||
                image.readUInt32BE(16) !== 1200 ||
                image.readUInt32BE(20) !== 630) {
              fail(`${rel}: OG-зображення має бути PNG 1200×630 — ${imagePath}`);
            }
          }
        } catch {
          fail(`${rel}: некоректний URL og:image — ${imageUrl}`);
        }
      }
      if (/<article\b[^>]*class="entry"/.test(html)) {
        if (metas.get("property:og:type")?.[0] !== "article") {
          fail(`${rel}: запис має og:type=article`);
        }
        if (!metas.get("property:article:published_time")?.[0]) {
          fail(`${rel}: запис не має article:published_time`);
        }
        if (!metas.get("property:article:author")?.[0]) {
          fail(`${rel}: запис не має article:author`);
        }
      }
    }
    if (socialErrors === 0) {
      console.log(`  ✅ Метатеги OG/X повні; усі ${htmlFiles.length} карток мають PNG 1200×630; записи мають article metadata`);
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

function parseHtmlAttributes(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attributes;
}

function decodeHtmlEntities(value) {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: "\u00a0", quot: '"' };
  return value.replace(/&(#(?:x[0-9a-f]+|[0-9]+)|[a-z][a-z0-9]+);/gi, (entity, reference) => {
    if (reference[0] !== "#") return named[reference.toLowerCase()] ?? entity;
    const hexadecimal = reference[1]?.toLowerCase() === "x";
    const codePoint = Number.parseInt(reference.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return entity;
    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return entity;
    }
  });
}

function displayText(value) {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}
