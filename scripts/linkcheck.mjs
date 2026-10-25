#!/usr/bin/env node
// linkcheck.mjs: нуль битих лінків (PLAN крок 132)
// Перевіряє у dist/: внутрішні href/src (файли існують), якорі (id існує),
// порожні лінки, <loc> у sitemap.xml, <link>/<guid> у RSS.
// Зовнішні https — лише канонічні (koztechie.fyi, github.com §277);
// інші сторонні origin ловить check.mjs розділ 4.
// Використання: node scripts/linkcheck.mjs [dist/]
// Експорт: runLinkcheck(distDir) — викликається check.mjs.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, extname } from "node:path";

// Канонічні зовнішні origin: домен сайту, github (§277 — єдиний лінк коду),
// play.google.com (§290 — магазин застосунку NICHLYST, крок 145)
const ALLOWED_EXTERNAL = [/^https:\/\/koztechie\.fyi\//, /^https:\/\/github\.com\//, /^https:\/\/play\.google\.com\//];

function walk(dir) {
  const out = [];
  try {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) out.push(...walk(full));
      else out.push(full);
    }
  } catch {
    /* тека не існує */
  }
  return out;
}

// Резолв внутрішнього шляху відносно dist: приймає якісні кандидати.
// Експортується для check.mjs (розділ 7л — перевірка перемикача мов).
export function resolveInternal(distDir, path) {
  const clean = path.split("#")[0].split("?")[0];
  if (!clean || clean === "/") return existsSync(join(distDir, "index.html"));
  const base = clean.startsWith("/") ? clean.slice(1) : clean;
  const candidates =
    clean.endsWith("/")
      ? [join(base, "index.html")]
      : extname(base)
        ? [base]
        : [base, join(base, "index.html"), `${base}.html`];
  return candidates.some((c) => existsSync(join(distDir, c)));
}

function checkAnchor(doc, hash) {
  if (!hash) return true;
  const id = hash.slice(1);
  if (!id) return true; // просто "#"
  return (
    new RegExp(`id\\s*=\\s*["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(doc) ||
    new RegExp(`<a\\s+name\\s*=\\s*["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(doc)
  );
}

export function runLinkcheck(distDir) {
  const errors = [];
  let checked = 0;

  if (!existsSync(distDir)) {
    return { checked: 0, errors: ["dist/ не існує (спочатку npm run build)"] };
  }

  const htmlFiles = walk(distDir).filter((f) => f.endsWith(".html"));

  for (const file of htmlFiles) {
    const rel = file.slice(distDir.length + 1);
    const doc = readFileSync(file, "utf-8");
    const links = [
      ...[...doc.matchAll(/\bhref\s*=\s*"([^"]*)"/g)].map((m) => m[1]),
      ...[...doc.matchAll(/\bsrc\s*=\s*"([^"]*)"/g)].map((m) => m[1]),
    ];

    for (const raw of links) {
      const link = raw.trim();
      checked++;

      // Порожні та заглушки
      if (link === "" || link === "#") {
        errors.push(`${rel}: порожній лінк «${raw}»`);
        continue;
      }
      if (/^javascript:/i.test(link)) {
        errors.push(`${rel}: javascript: лінк (JS: 0, TECH_STANDARDS §5)`);
        continue;
      }

      // Якір у тому самому документі
      if (link.startsWith("#")) {
        if (!checkAnchor(doc, link)) errors.push(`${rel}: битий якір «${link}» (id не знайдено)`);
        continue;
      }

      // Пошта / телефон — формат
      if (/^mailto:/i.test(link)) {
        if (!/^mailto:[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(link)) {
          errors.push(`${rel}: хибний mailto «${link}»`);
        }
        continue;
      }
      if (/^tel:/i.test(link)) continue;

      // Зовнішні — лише канонічні origin
      if (/^https?:\/\//i.test(link)) {
        if (!ALLOWED_EXTERNAL.some((re) => re.test(link))) {
          errors.push(`${rel}: недозволений зовнішній origin «${link}» (дозволено koztechie.fyi, github.com)`);
        }
        continue;
      }

      // Внутрішні
      if (link.startsWith("/")) {
        if (!resolveInternal(distDir, link)) {
          errors.push(`${rel}: битий лінк «${link}» (файл не існує в dist/)`);
        }
      } else {
        errors.push(`${rel}: відносний лінк «${link}» (всі лінки — від кореня «/»)`);
      }
    }
  }

  // sitemap.xml: <loc> має вказувати на наявну сторінку
  const sitemapPath = join(distDir, "sitemap.xml");
  if (existsSync(sitemapPath)) {
    const xml = readFileSync(sitemapPath, "utf-8");
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      checked++;
      const url = m[1].trim();
      if (!url.startsWith("https://koztechie.fyi/")) {
        errors.push(`sitemap.xml: чужий <loc> «${url}»`);
        continue;
      }
      const path = url.slice("https://koztechie.fyi".length);
      if (!resolveInternal(distDir, path)) {
        errors.push(`sitemap.xml: <loc> веде на неіснуючу сторінку «${path}»`);
      }
    }
  }

  // RSS: <link> записів має вести на наявні сторінки
  for (const feed of ["feed.xml", "en/feed.xml"]) {
    const feedPath = join(distDir, feed);
    if (!existsSync(feedPath)) continue;
    const xml = readFileSync(feedPath, "utf-8");
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    for (const item of items) {
      const link = item.match(/<link>([^<]+)<\/link>/)?.[1]?.trim();
      if (!link) continue;
      checked++;
      if (!link.startsWith("https://koztechie.fyi/")) {
        errors.push(`${feed}: <link> запису поза доменом «${link}»`);
        continue;
      }
      const path = link.slice("https://koztechie.fyi".length);
      if (!resolveInternal(distDir, path)) {
        errors.push(`${feed}: <link> веде на неіснуючу сторінку «${path}»`);
      }
    }
  }

  return { checked, errors };
}

// CLI-режим
if (import.meta.url === `file://${process.argv[1]}`) {
  const distDir = resolve(process.argv[2] || "dist");
  console.log("=== LINKCHECK ===");
  const { checked, errors } = runLinkcheck(distDir);
  console.log(`Перевірено лінків: ${checked}`);
  for (const e of errors) console.log(`  ❌ ${e}`);
  console.log("");
  if (errors.length) {
    console.log(`РЕЗУЛЬТАТ: ${errors.length} битих лінків`);
    process.exit(1);
  }
  console.log("РЕЗУЛЬТАТ: нуль битих лінків");
  process.exit(0);
}
