#!/usr/bin/env node
// Щоденний легкий production probe без сторонніх сервісів і залежностей.

const origin = (process.env.LIVE_PROBE_ORIGIN || "https://koztechie.fyi").replace(/\/$/, "");
const timeoutMs = 4_500;
const checks = [
  "/",
  "/en/",
  "/accessibility/",
  "/en/accessibility/",
  "/colophon/",
  "/en/colophon/",
  "/contact/",
  "/en/contact/",
  "/manifest/",
  "/en/manifest/",
  "/privacy/",
  "/en/privacy/",
  "/.well-known/security.txt",
];
const failures = [];
const stylesheetPaths = new Set();

function fail(message) {
  failures.push(message);
  console.error(`❌ ${message}`);
}

async function get(path, options = {}) {
  try {
    return await fetch(`${origin}${path}`, {
      redirect: options.redirect || "follow",
      headers: { "user-agent": "koztechie.fyi light-live-probe/1.0" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    fail(`${path}: ${error.message}`);
    return null;
  }
}

const pageResults = await Promise.all(checks.map(async (path) => [path, await get(path)]));
let rootHtml = "";
const htmlPages = [];

for (const [path, response] of pageResults) {
  if (!response) continue;
  if (response.status !== 200) {
    fail(`${path}: очікувався 200, отримано ${response.status}`);
    continue;
  }

  if (path !== "/.well-known/security.txt") {
    const csp = response.headers.get("content-security-policy") || "";
    if (
      !csp.includes("default-src 'self'") ||
      !csp.includes("style-src 'self'") ||
      !csp.includes("script-src 'none'") ||
      !csp.includes("frame-ancestors 'none'")
    ) {
      fail(`${path}: CSP відсутня або не містить обов'язкових директив`);
    }
    const hsts = response.headers.get("strict-transport-security") || "";
    if (!hsts.includes("max-age=31536000") || !hsts.includes("includeSubDomains")) {
      fail(`${path}: HSTS неповний`);
    }
    if (response.headers.get("x-content-type-options")?.toLowerCase() !== "nosniff") {
      fail(`${path}: X-Content-Type-Options відсутній або не nosniff`);
    }
    if (response.headers.get("x-frame-options")?.toUpperCase() !== "DENY") {
      fail(`${path}: X-Frame-Options відсутній або не DENY`);
    }
    if (path === "/" || path === "/en/") {
      const cache = (response.headers.get("cache-control") || "").replace(/\s+/g, "").toLowerCase();
      if (!cache.includes("max-age=0,must-revalidate")) {
        fail(`${path}: Cache-Control не містить max-age=0,must-revalidate`);
      }
    }
    const html = await response.text();
    htmlPages.push({ path, html });
    if (path === "/") rootHtml = html;
  } else {
    const body = await response.text();
    if (!/^Contact:\s*mailto:\S+$/mi.test(body)) {
      fail("security.txt: Contact відсутній");
    }
  }

  console.log(`✅ ${path}: 200`);
}

console.log(`HTML-сторінок перевірено: ${htmlPages.length}/${checks.length - 1}`);
if (htmlPages.length < 10) {
  fail(`Перевірено лише ${htmlPages.length} HTML-сторінок; потрібно щонайменше 10`);
}
if (
  !htmlPages.some(({ path }) => !path.startsWith("/en/")) ||
  !htmlPages.some(({ path }) => path.startsWith("/en/"))
) {
  fail("У smoke мають успішно перевірятися HTML-сторінки обома мовами");
}

const versionResponse = await get("/version.json");
let deployedSha = "";
if (versionResponse?.status !== 200) {
  fail(`/version.json: очікувався 200, отримано ${versionResponse?.status || "network"}`);
} else {
  try {
    const version = await versionResponse.json();
    deployedSha = typeof version.sha === "string" ? version.sha : "";
  } catch {
    fail("/version.json: невалідний JSON");
  }
}

const expectedSha = process.env.EXPECTED_COMMIT_SHA?.trim() || deployedSha;
if (!/^[a-f0-9]{40}$/i.test(expectedSha)) {
  fail(`Очікуваний commit SHA не задано або він невалідний: «${expectedSha || "порожній"}»`);
}

for (const { path, html } of htmlPages) {
  const commitSha = html.match(/<meta\b(?=[^>]*\bname=["']x-commit["'])[^>]*\bcontent=["']([^"']*)["'][^>]*>/i)?.[1];
  if (commitSha !== expectedSha) {
    fail(`${path}: x-commit «${commitSha || "відсутній"}» не збігається з ${expectedSha}`);
  }

  // JSON-LD є даними, а не виконуваним JavaScript; решта script-тегів заборонена.
  const scriptTags = [...html.matchAll(/<script\b[^>]*>/gi)].map((match) => match[0]);
  const executableTags = scriptTags.filter(
    (tag) => !/\btype=["']application\/ld\+json["']/i.test(tag),
  );
  if (executableTags.length) {
    fail(`${path}: знайдено ${executableTags.length} виконуваних <script> (дозволено лише JSON-LD)`);
  }

  const stylesheetTag = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .find((tag) => {
      const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1] || "";
      const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1] || "";
      return rel.split(/\s+/).includes("stylesheet") && /\/styles\/site\.[^/]+\.css$/.test(href);
    });
  const pageStylesheet = stylesheetTag?.match(/\bhref=["']([^"']+)["']/i)?.[1];
  if (!pageStylesheet) {
    fail(`${path}: fingerprinted site stylesheet відсутній`);
  } else {
    stylesheetPaths.add(new URL(pageStylesheet, `${origin}/`).pathname);
  }

  console.log(`✅ ${path}: x-commit ${commitSha === expectedSha ? "PASS" : "FAIL"}; виконуваних script ${executableTags.length}`);
}

for (const path of stylesheetPaths) {
  const response = await get(path);
  if (response?.status !== 200) {
    fail(`${path}: очікувався 200, отримано ${response?.status || "network"}`);
    continue;
  }
  const css = await response.text();
  if (!/--paper\s*:/.test(css)) {
    fail(`${path}: CSS не містить palette token --paper`);
  } else {
    console.log(`✅ ${path}: palette token --paper присутній`);
  }
}

const stylesheetTag = [...rootHtml.matchAll(/<link\b[^>]*>/gi)]
  .map((match) => match[0])
  .find((tag) => {
    const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1] || "";
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1] || "";
    return rel.split(/\s+/).includes("stylesheet") && /\/styles\/site\.[^/]+\.css$/.test(href);
  });
const stylesheetPath = stylesheetTag?.match(/\bhref=["']([^"']+)["']/i)?.[1];

if (!stylesheetPath) {
  fail("/: stylesheet /styles/site.*.css не знайдено");
} else {
  const stylesheetUrl = new URL(stylesheetPath, `${origin}/`);
  const response = await get(`${stylesheetUrl.pathname}${stylesheetUrl.search}`);
  if (response?.status !== 200) {
    fail(`${stylesheetUrl.pathname}: очікувався 200, отримано ${response?.status || "network"}`);
  } else {
    const cache = (response.headers.get("cache-control") || "").toLowerCase();
    if (!cache.includes("immutable")) {
      fail(`${stylesheetUrl.pathname}: Cache-Control не містить immutable`);
    }
    console.log(`✅ ${stylesheetUrl.pathname}: 200, immutable`);
  }
}

const [indexResponse, missingResponse, feedResponse] = await Promise.all([
  get("/index.html", { redirect: "manual" }),
  get("/__missing__"),
  get("/feed.xml"),
]);

if (indexResponse?.status !== 301) {
  fail(`/index.html: очікувався 301, отримано ${indexResponse?.status || "network"}`);
} else {
  const location = indexResponse.headers.get("location") || "";
  if (!location.endsWith("/")) {
    fail(`/index.html: Location має вести на /, отримано ${location || "відсутній"}`);
  } else {
    console.log("✅ /index.html: 301 → /");
  }
}

if (missingResponse?.status !== 404) {
  fail(`/__missing__: очікувався 404, отримано ${missingResponse?.status || "network"}`);
} else {
  console.log("✅ /__missing__: 404");
}

if (
  !feedResponse ||
  feedResponse.status !== 200 ||
  !((feedResponse.headers.get("content-type") || "").toLowerCase().includes("application/rss+xml"))
) {
  fail(
    `/feed.xml: очікувався HTTP 200 і Content-Type application/rss+xml, отримано ${feedResponse?.status || "network"} / ${feedResponse?.headers.get("content-type") || "без Content-Type"}`,
  );
} else {
  console.log("✅ /feed.xml: application/rss+xml");
}

if (failures.length) {
  console.error(`РЕЗУЛЬТАТ: light-live-probe провалено (${failures.length})`);
  process.exit(1);
}
console.log("РЕЗУЛЬТАТ: light-live-probe пройдено");
