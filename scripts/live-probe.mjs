#!/usr/bin/env node
// Синтетична production-перевірка без сторонніх сервісів і залежностей.

import { spawnSync } from "node:child_process";

const origin = (process.env.LIVE_PROBE_ORIGIN || "https://koztechie.fyi").replace(/\/$/, "");
const timeoutMs = 15_000;
const userAgent = "koztechie.fyi live-probe/1.0";
const failures = [];

function fail(message) {
  failures.push(message);
  console.error(`❌ ${message}`);
}

async function get(path, options = {}) {
  const url = path.startsWith("http") ? path : `${origin}${path}`;
  try {
    const response = await fetch(url, {
      redirect: options.redirect || "follow",
      headers: { "user-agent": userAgent },
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { response, url };
  } catch (error) {
    fail(`${url}: ${error.message}`);
    return { response: null, url };
  }
}

function header(response, name) {
  return response.headers.get(name) || "";
}

function parseSitemap(xml) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => {
    const block = match[1];
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    const alternates = Object.fromEntries(
      [...block.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((item) => [item[1], item[2]])
    );
    return { loc, alternates };
  }).filter((entry) => entry.loc);
}

function parseHtml(html, url) {
  const canonical = [
    ...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/gi),
    ...html.matchAll(/<link\b[^>]*href="([^"]+)"[^>]*rel="canonical"/gi),
  ][0]?.[1];
  const hreflang = Object.fromEntries(
    [...html.matchAll(/<link\b[^>]*rel="alternate"[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"/gi)]
      .map((item) => [item[1], item[2]])
  );
  const stylesheets = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/gi)]
    .map((item) => new URL(item[1], url).href);
  return { canonical, hreflang, stylesheets };
}

async function checkSitemap() {
  const sitemapResult = await get("/sitemap.xml");
  if (!sitemapResult.response || sitemapResult.response.status !== 200) {
    fail(`/sitemap.xml: очікувався 200, отримано ${sitemapResult.response?.status || "network"}`);
    return [];
  }
  const entries = parseSitemap(await sitemapResult.response.text());
  if (!entries.length) {
    fail("/sitemap.xml: не знайдено URL");
    return [];
  }
  console.log(`Sitemap URL: ${entries.length}`);
  return entries;
}

async function checkPage(entry, sitemapMap) {
  const result = await get(entry.loc);
  if (!result.response) return;
  if (result.response.status !== 200) {
    fail(`${entry.loc}: очікувався 200, отримано ${result.response.status}`);
    return;
  }

  for (const [name, expected] of [
    ["content-security-policy", "default-src 'self'"],
    ["strict-transport-security", "max-age=31536000"],
    ["strict-transport-security", "includeSubDomains"],
    ["x-content-type-options", "nosniff"],
  ]) {
    if (!header(result.response, name).includes(expected)) {
      fail(`${entry.loc}: ${name} не містить «${expected}»`);
    }
  }

  const html = await result.response.text();
  const parsed = parseHtml(html, entry.loc);
  if (parsed.canonical !== entry.loc) {
    fail(`${entry.loc}: canonical «${parsed.canonical || "відсутній"}»`);
  }

  const currentLang = new URL(entry.loc).pathname.startsWith("/en/") ? "en" : "uk";
  for (const [lang, alternate] of Object.entries(entry.alternates)) {
    const target = sitemapMap.get(alternate);
    if (!target || target.alternates[currentLang] !== entry.loc) {
      fail(`${entry.loc}: hreflang ${lang} не має взаємної пари`);
    }
    if (parsed.hreflang[lang] !== alternate) {
      fail(`${entry.loc}: HTML hreflang ${lang} не збігається із sitemap`);
    }
  }

  for (const stylesheet of parsed.stylesheets) {
    if (!new URL(stylesheet).pathname.startsWith("/styles/")) {
      fail(`${entry.loc}: stylesheet поза /styles/: ${stylesheet}`);
      continue;
    }
    const asset = await get(stylesheet);
    if (!asset.response || asset.response.status !== 200) {
      fail(`${stylesheet}: очікувався 200`);
    } else if (!header(asset.response, "cache-control").includes("immutable")) {
      fail(`${stylesheet}: Cache-Control не містить immutable`);
    }
  }
}

async function checkSpecialPaths() {
  for (const path of ["/nichlyst/", "/nichlyst/privacy/"]) {
    const result = await get(path);
    if (result.response?.status !== 200) {
      fail(`${path}: очікувався 200, отримано ${result.response?.status || "network"}`);
    } else if (!header(result.response, "cache-control").includes("max-age=604800")) {
      fail(`${path}: Cache-Control не містить max-age=604800`);
    }
  }

  for (const path of ["/feed.xml", "/en/feed.xml"]) {
    const result = await get(path);
    if (result.response?.status !== 200) {
      fail(`${path}: очікувався 200, отримано ${result.response?.status || "network"}`);
    } else if (!header(result.response, "content-type").includes("application/rss+xml")) {
      fail(`${path}: неправильний Content-Type «${header(result.response, "content-type")}»`);
    }
  }

  const missing = await get("/__koztechie_live_probe_missing__");
  if (missing.response?.status !== 404) {
    fail("вигаданий URL: очікувався 404");
  }

  for (const path of ["/index.html", "/poetry/koleso-sansary/"]) {
    const result = await get(path, { redirect: "manual" });
    if (result.response?.status !== 301) {
      fail(`${path}: очікувався redirect 301, отримано ${result.response?.status || "network"}`);
    }
  }
}

console.log("=== LIVE-PROBE ===");
console.log(`Origin: ${origin}`);
const entries = await checkSitemap();
const sitemapMap = new Map(entries.map((entry) => [entry.loc, entry]));
for (const entry of entries) await checkPage(entry, sitemapMap);
await checkSpecialPaths();

function runProductionCheck(command, args, env) {
  const result = spawnSync(command, args, {
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  if (result.error) fail(`${command} ${args.join(" ")}: ${result.error.message}`);
  else if (result.status !== 0) fail(`${command} ${args.join(" ")}: exit ${result.status}`);
}

console.log("=== LIVE-PROBE: A11Y MATRIX ===");
runProductionCheck("node", ["scripts/a11y-matrix.mjs"], { A11Y_MATRIX_ORIGIN: origin });
console.log("=== LIVE-PROBE: EXTERNAL LINKS ===");
runProductionCheck("node", ["scripts/external-linkcheck.mjs", "--strict"], {
  LINKCHECK_ORIGIN: origin,
  LINKCHECK_STRICT: "1",
});

if (failures.length) {
  console.error(`РЕЗУЛЬТАТ: ${failures.length} live-probe помилок`);
  process.exit(1);
}
console.log(`РЕЗУЛЬТАТ: live-probe пройдено (${entries.length} URL зі sitemap)`);
