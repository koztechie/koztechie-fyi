#!/usr/bin/env node
// Синтетична production-перевірка без сторонніх сервісів і залежностей.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const origin = (process.env.LIVE_PROBE_ORIGIN || "https://koztechie.fyi").replace(/\/$/, "");
const timeoutMs = 15_000;
const userAgent = "koztechie.fyi live-probe/1.0";
const failures = [];
const ogImages = new Set();

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
  const socialImages = [...html.matchAll(/<meta\b[^>]*property="og:image"[^>]*content="([^"]+)"/gi)]
    .map((item) => new URL(item[1], url).pathname);
  return { canonical, hreflang, stylesheets, socialImages };
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

async function checkPublicPageCount(entries) {
  const result = await get("/pages.json");
  if (!result.response || result.response.status !== 200) {
    fail(`/pages.json: очікувався 200, отримано ${result.response?.status || "network"}`);
    return;
  }
  let pages;
  try {
    pages = await result.response.json();
  } catch {
    fail("/pages.json: невалідний JSON");
    return;
  }
  if (!Array.isArray(pages) || pages.some((page) => !page || typeof page.url !== "string")) {
    fail("/pages.json: очікувався масив publicPages");
    return;
  }
  const sitemapUrls = new Set(entries.map((entry) => new URL(entry.loc).pathname));
  const publicUrls = new Set(pages.map((page) => page.url));
  if (entries.length !== pages.length) {
    fail(`sitemap/publicPages: ${entries.length} URL у sitemap ↔ ${pages.length} publicPages`);
  }
  if (sitemapUrls.size !== publicUrls.size || [...sitemapUrls].some((url) => !publicUrls.has(url))) {
    fail("sitemap/publicPages: URL-склад не збігається");
  } else {
    console.log(`Public pages: ${pages.length} (sitemap parity ✅)`);
  }
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
  for (const image of parsed.socialImages) ogImages.add(image);
  if (parsed.canonical !== entry.loc) {
    fail(`${entry.loc}: canonical «${parsed.canonical || "відсутній"}»`);
  }

  const currentLang = new URL(entry.loc).pathname.startsWith("/en/") ? "en" : "uk";
  for (const [lang, alternate] of Object.entries(entry.alternates)) {
    const target = sitemapMap.get(alternate);
    if (lang === "x-default") {
      if (!target || alternate !== entry.alternates.uk) {
        fail(`${entry.loc}: hreflang x-default має вказувати на українську sitemap-версію`);
      }
    } else if (!target || target.alternates[currentLang] !== entry.loc) {
      fail(`${entry.loc}: hreflang ${lang} не має взаємної пари`);
    }
    if (parsed.hreflang[lang] !== alternate) {
      fail(`${entry.loc}: HTML hreflang ${lang} не збігається із sitemap`);
    }
  }
  if (Object.keys(entry.alternates).sort().join(",") !== Object.keys(parsed.hreflang).sort().join(",")) {
    fail(`${entry.loc}: набір HTML hreflang не збігається із sitemap`);
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

async function checkProductionParity() {
  console.log("=== LIVE-PROBE: PRODUCTION PARITY ===");

  const previousCss = (process.env.LIVE_PROBE_PREVIOUS_CSS || "")
    .split(/\s+/)
    .filter(Boolean);
  for (const path of previousCss) {
    if (!/^\/styles\/(?:site|print)\.[a-f0-9]{12}\.css$/.test(path)) {
      fail(`LIVE_PROBE_PREVIOUS_CSS містить невалідний CSS fingerprint: ${path}`);
      continue;
    }
    const result = await get(path);
    if (!result.response || result.response.status !== 200) {
      fail(`${path}: попередній CSS fingerprint має залишатися доступним (очікувався 200, отримано ${result.response?.status || "network"})`);
    } else {
      console.log(`✅ ${path}: попередній CSS fingerprint доступний`);
    }
  }

  const assetPaths = new Set(["/favicon.ico", "/apple-touch-icon.png", ...ogImages]);
  let verifiedOgCount = 0;
  for (const path of assetPaths) {
    const result = await get(path);
    if (!result.response || result.response.status !== 200) {
      fail(`${path}: production asset має повертати 200, отримано ${result.response?.status || "network"}`);
    } else if (path.startsWith("/og/") && path.endsWith(".png")) {
      const png = Buffer.from(await result.response.arrayBuffer());
      const isPng = png.length >= 24
        && png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const width = isPng ? png.readUInt32BE(16) : 0;
      const height = isPng ? png.readUInt32BE(20) : 0;
      if (!isPng || width !== 1200 || height !== 630) {
        fail(`${path}: очікувався PNG 1200×630`);
      } else {
        verifiedOgCount++;
      }
    }
  }
  if (verifiedOgCount) {
    console.log(`OG assets: ${verifiedOgCount} production PNG перевірено (1200×630)`);
  }

  const manifestResult = await get("/site.webmanifest");
  if (!manifestResult.response || manifestResult.response.status !== 200) {
    fail(`/site.webmanifest: очікувався 200, отримано ${manifestResult.response?.status || "network"}`);
  } else {
    try {
      const manifest = await manifestResult.response.json();
      const required = {
        id: "/",
        start_url: "/",
        scope: "/",
        display: "browser",
        lang: "uk",
        name: "koztechie",
        short_name: "koztechie",
        description: "Текст без прикрас. Архівний вузол Євгенія Козловського.",
        theme_color: "#fafafa",
        background_color: "#fafafa",
      };
      for (const [key, expected] of Object.entries(required)) {
        if (manifest[key] !== expected) fail(`/site.webmanifest: ${key} не збігається з каноном`);
      }
      const icon = Array.isArray(manifest.icons)
        ? manifest.icons.find((item) => item?.src === "/favicon.svg")
        : null;
      if (!icon || icon.sizes !== "any" || icon.type !== "image/svg+xml") {
        fail("/site.webmanifest: відсутня коректна SVG-іконка /favicon.svg");
      }
    } catch (error) {
      fail(`/site.webmanifest: невалідний JSON (${error.message})`);
    }
  }

  const securityResult = await get("/.well-known/security.txt");
  if (!securityResult.response || securityResult.response.status !== 200) {
    fail("/.well-known/security.txt: очікувався 200");
  } else {
    const security = await securityResult.response.text();
    const expires = security.match(/^Expires:\s*(.+)$/mi)?.[1]?.trim();
    if (!expires || !Number.isFinite(Date.parse(expires)) || Date.parse(expires) <= Date.now()) {
      fail("/.well-known/security.txt: Expires має бути валідною майбутньою датою");
    }
  }

  const pageResult = await get("/");
  const faviconResult = await get("/favicon.svg");
  const csp = pageResult.response ? header(pageResult.response, "content-security-policy") : "";
  const favicon = faviconResult.response ? await faviconResult.response.text() : "";
  const faviconStyle = favicon.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  const expectedHash = faviconStyle === undefined
    ? ""
    : `'sha256-${createHash("sha256").update(faviconStyle).digest("base64")}'`;
  if (!expectedHash || !csp.includes(expectedHash)) {
    fail(`CSP favicon hash не збігається з production /favicon.svg (очікується ${expectedHash || "inline style hash"})`);
  }

}

async function checkSpecialPaths() {
  for (const path of [
    "/nichlyst/",
    "/nichlyst/privacy/",
    "/en/nichlyst/",
    "/en/nichlyst/privacy/",
  ]) {
    const result = await get(path);
    if (result.response?.status !== 200) {
      fail(`${path}: очікувався 200, отримано ${result.response?.status || "network"}`);
    } else {
      const cacheControl = header(result.response, "cache-control");
      if (!cacheControl.includes("max-age=0") || !cacheControl.includes("must-revalidate")) {
        fail(`${path}: HTML Cache-Control має бути max-age=0,must-revalidate; отримано «${cacheControl}»`);
      }
    }
  }

  for (const path of [
    "/nichlyst/first-knock.webp",
    "/nichlyst/choice-recorded.webp",
    "/nichlyst/logo.webp",
    "/nichlyst/title-screen.webp",
  ]) {
    const result = await get(path);
    if (result.response?.status !== 200) {
      fail(`${path}: очікувався 200, отримано ${result.response?.status || "network"}`);
    } else {
      const cacheControl = header(result.response, "cache-control");
      if (!cacheControl.includes("max-age=604800")
        || !cacheControl.includes("stale-while-revalidate=86400")) {
        fail(`${path}: asset Cache-Control має бути max-age=604800,swr=86400; отримано «${cacheControl}»`);
      }
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

  for (const [path, expectedLocation] of [
    ["/index.html", "/"],
    ["/blog/index.html", "/blog/"],
    ["/en/index.html", "/en/"],
  ]) {
    const result = await get(path, { redirect: "manual" });
    if (result.response?.status !== 301) {
      fail(`${path}: очікувався redirect 301, отримано ${result.response?.status || "network"}`);
    } else if (new URL(header(result.response, "location"), `${origin}/`).pathname !== expectedLocation) {
      fail(`${path}: Location має вести на ${expectedLocation}, отримано «${header(result.response, "location") || "відсутній"}»`);
    } else {
      console.log(`✅ ${path}: 301 → ${expectedLocation}`);
    }
  }

  const direct404 = await get("/404.html", { redirect: "manual" });
  if (direct404.response?.status !== 404) {
    fail(`/404.html: очікувався 404, отримано ${direct404.response?.status || "network"}`);
  } else {
    console.log("✅ /404.html: 404");
  }
}

async function checkNuValidation() {
  console.log("=== LIVE-PROBE: W3C NU ===");
  const paths = ["/", "/en/", "/nichlyst/", "/accessibility/", "/en/accessibility/"];
  for (const path of paths) {
    const documentUrl = `${origin}${path}`;
    const nuUrl = `https://validator.w3.org/nu/?doc=${encodeURIComponent(documentUrl)}&out=json`;
    try {
      let response;
      for (let attempt = 1; attempt <= 3; attempt++) {
        response = await fetch(nuUrl, {
          headers: { "user-agent": userAgent },
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.status !== 429 || attempt === 3) break;
        const retryAfter = Number(response.headers.get("retry-after"));
        const delayMs = Number.isFinite(retryAfter)
          ? Math.min(retryAfter * 1000, 15_000)
          : attempt * 3_000;
        console.warn(`⚠️ Nu ${path}: HTTP 429, повтор через ${delayMs / 1000} с`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      if (!response.ok) {
        console.warn(`⚠️ Nu ${path}: зовнішній валідатор повернув HTTP ${response.status}; локальна HTML-перевірка лишається обов'язковою`);
        continue;
      }
      const report = await response.json();
      const errors = Array.isArray(report.messages)
        ? report.messages.filter((message) => message.type === "error")
        : [];
      if (errors.length) {
        fail(`Nu ${path}: ${errors.length} error(s)`);
        for (const error of errors) {
          console.error(`  ${error.message}${error.lastLine ? ` (${error.lastLine}:${error.lastColumn || 1})` : ""}`);
        }
      } else {
        console.log(`✅ Nu ${path}: 0 errors`);
      }
    } catch (error) {
      console.warn(`⚠️ Nu ${path}: зовнішній валідатор недоступний (${error.message}); локальна HTML-перевірка лишається обов'язковою`);
    }
  }
}

console.log("=== LIVE-PROBE ===");
console.log(`Origin: ${origin}`);
const entries = await checkSitemap();
const sitemapMap = new Map(entries.map((entry) => [entry.loc, entry]));
await checkPublicPageCount(entries);
for (const entry of entries) await checkPage(entry, sitemapMap);
await checkSpecialPaths();
await checkNuValidation();
await checkProductionParity();

function runProductionCheck(command, args, env) {
  const result = spawnSync(command, args, {
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  if (result.error) fail(`${command} ${args.join(" ")}: ${result.error.message}`);
  else if (result.status !== 0) fail(`${command} ${args.join(" ")}: exit ${result.status}`);
}

console.log("=== LIVE-PROBE: EMAIL DNS ===");
runProductionCheck("node", ["scripts/email-dns-gate.mjs"], {
  EMAIL_DNS_DOMAIN: new URL(origin).hostname,
  EMAIL_SECURITY_URL: `${origin}/.well-known/security.txt`,
});
console.log("=== LIVE-PROBE: A11Y MATRIX (зібраний dist) ===");
runProductionCheck("node", ["scripts/a11y-matrix.mjs"]);
console.log("=== LIVE-PROBE: EXTERNAL LINKS ===");
runProductionCheck("node", ["scripts/external-linkcheck.mjs"], {
  LINKCHECK_ORIGIN: origin,
  // Third-party downtime is reported but must not block a personal-site deploy.
  LINKCHECK_STRICT: "0",
});

if (failures.length) {
  console.error(`РЕЗУЛЬТАТ: ${failures.length} live-probe помилок`);
  process.exit(1);
}
console.log(`РЕЗУЛЬТАТ: live-probe пройдено (${entries.length} URL зі sitemap)`);
