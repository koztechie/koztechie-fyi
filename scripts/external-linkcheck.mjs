#!/usr/bin/env node
// Перевіряє доступність HTTPS-посилань із зібраних HTML-сторінок у CI.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const distDir = resolve(process.argv[2] || "dist");
const ownHost = "koztechie.fyi";
const timeoutMs = 12_000;

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

const links = new Map();
for (const file of walk(distDir).filter((path) => path.endsWith(".html"))) {
  const rel = file.slice(distDir.length + 1);
  const html = readFileSync(file, "utf8");
  for (const [, href] of html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)) {
    let url;
    try {
      url = new URL(href);
    } catch {
      continue;
    }
    if (!["https:", "http:"].includes(url.protocol) || url.hostname === ownHost) continue;
    if (!links.has(url.href)) links.set(url.href, new Set());
    links.get(url.href).add(rel);
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

async function check(url) {
  let response = await request(url, "HEAD");
  if (!response.ok) {
    response = await request(url, "GET");
    if (response.body) await response.body.cancel();
  }
  return response;
}

console.log("=== EXTERNAL-LINKCHECK ===");
console.log(`Унікальних зовнішніх HTTPS-посилань: ${links.size}`);

let errors = 0;
for (const [url, sources] of links) {
  try {
    const response = await check(url);
    if (!response.ok) {
      console.error(`❌ ${response.status} ${url} (у ${[...sources].join(", ")})`);
      errors++;
    } else {
      console.log(`✅ ${response.status} ${url}`);
    }
  } catch (error) {
    console.error(`❌ Не вдалося перевірити ${url}: ${error.message} (у ${[...sources].join(", ")})`);
    errors++;
  }
}

if (errors) {
  console.error(`РЕЗУЛЬТАТ: ${errors} зовнішніх посилань недоступні`);
  process.exit(1);
}
console.log("РЕЗУЛЬТАТ: усі зовнішні посилання доступні");
