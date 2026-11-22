#!/usr/bin/env node
// Перевіряє доступність HTTPS-посилань із зібраних HTML-сторінок у CI.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const distArg = process.argv.slice(2).find((argument) => !argument.startsWith("-"));
const distDir = resolve(distArg || "dist");
const ownHost = "koztechie.fyi";
const productionOrigin = (process.env.LINKCHECK_ORIGIN || "").replace(/\/$/, "");
const strict = process.argv.includes("--strict") || process.env.LINKCHECK_STRICT === "1";
const timeoutMs = 12_000;
const maxAttempts = 3;
const retryBackoffMs = [1_000, 3_000, 9_000];

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

if (!existsSync(distDir)) {
  console.error(`❌ ${distDir} не існує. Спочатку npm run build`);
  process.exit(1);
}

async function productionPages() {
  const response = await fetch(`${productionOrigin}/sitemap.xml`, {
    headers: { "user-agent": "koztechie.fyi external-link-check/1.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`sitemap.xml: HTTP ${response.status}`);
  const sitemap = await response.text();
  const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => new URL(match[1]).pathname);
  const localStubs = walk(distDir)
    .filter((file) => {
      const html = readFileSync(file, "utf8");
      return /<meta name="robots" content="noindex">/.test(html)
        && /\(not translated\)|\(переклад не готовий\)/.test(html);
    })
    .map((file) => `/${file.slice(distDir.length + 1).replace(/\\/g, "/").replace(/index\.html$/, "")}`);
  // 404 documents are not pages to crawl: their expected HTTP status is 404.
  return [...new Set([...paths, ...localStubs])];
}

async function pageSources() {
  if (!productionOrigin) {
    return walk(distDir).filter((path) => path.endsWith(".html")).map((file) => ({
      source: file.slice(distDir.length + 1),
      html: readFileSync(file, "utf8"),
    }));
  }
  const paths = await productionPages();
  return Promise.all(paths.map(async (path) => {
    const url = `${productionOrigin}${path}`;
    const response = await fetch(url, {
      headers: { "user-agent": "koztechie.fyi external-link-check/1.0" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return { source: url, html: await response.text() };
  }));
}

const links = new Map();
for (const { source, html } of await pageSources()) {
  for (const [, href] of html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)) {
    let url;
    try {
      url = new URL(href);
    } catch {
      continue;
    }
    if (!["https:", "http:"].includes(url.protocol) || url.hostname === ownHost) continue;
    if (!links.has(url.href)) links.set(url.href, new Set());
    links.get(url.href).add(source);
  }
}

async function request(url, method) {
  return fetch(url, {
    method,
    redirect: "follow",
    headers: { "user-agent": "koztechie.fyi external-link-check/1.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function checkOnce(url) {
  let response = await request(url, "HEAD");
  if (!response.ok) {
    response = await request(url, "GET");
    if (response.body) await response.body.cancel();
  }
  return response;
}

function isHardFailure(status) {
  return status >= 400 && status < 500 && status !== 429;
}

function isRetryableResponse(status) {
  return status === 429 || status >= 500;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function check(url) {
  let lastError;
  let lastResponse;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delay = retryBackoffMs[attempt - 1];
      console.log(`  ↻ retry ${attempt + 1}/${maxAttempts} через ${delay / 1_000}с: ${url}`);
      await sleep(delay);
    }

    try {
    const response = await checkOnce(url);
      lastResponse = response;
      if (!isRetryableResponse(response.status) || isHardFailure(response.status)) {
        return response;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return lastResponse;
}

console.log("=== EXTERNAL-LINKCHECK ===");
console.log(`Джерело: ${productionOrigin || distDir}`);
console.log(`Унікальних зовнішніх HTTPS-посилань: ${links.size}`);
console.log(`Retry: ${maxAttempts} спроби; backoff 1с/3с/9с; strict=${strict ? "так" : "ні"}`);

let hardErrors = 0;
let softErrors = 0;
for (const [url, sources] of links) {
  try {
    const response = await check(url);
    if (!response?.ok) {
      const source = ` (у ${[...sources].join(", ")})`;
      if (strict && response && isHardFailure(response.status)) {
        console.error(`❌ HARD ${response.status} ${url}${source}`);
        hardErrors++;
      } else {
        console.warn(`⚠ SOFT ${response?.status || "network"} ${url}${source}`);
        softErrors++;
      }
    } else {
      console.log(`✅ ${response.status} ${url}`);
    }
  } catch (error) {
    const mode = strict ? "HARD" : "SOFT";
    const output = strict ? console.error : console.warn;
    output(`⚠ ${mode} network ${url}: ${error.message} (у ${[...sources].join(", ")})`);
    if (strict) hardErrors++;
    else softErrors++;
  }
}

if (hardErrors) {
  console.error(`РЕЗУЛЬТАТ: ${hardErrors} HARD-відмов; SOFT: ${softErrors}`);
  process.exit(1);
}
if (softErrors) {
  console.warn(`РЕЗУЛЬТАТ: доступні посилання перевірено; SOFT-відмов: ${softErrors}`);
} else {
  console.log("РЕЗУЛЬТАТ: усі зовнішні посилання доступні");
}
