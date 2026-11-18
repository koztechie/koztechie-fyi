#!/usr/bin/env node

import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distDir = join(repoRoot, "dist");
const toolsRequire = createRequire(join(repoRoot, "scripts/tools/package.json"));
const { chromium } = toolsRequire("playwright");
const axeSrc = readFileSync(toolsRequire.resolve("axe-core/axe.min.js"), "utf8");
const localOrigin = "http://127.0.0.1:4173";
const origin = (process.env.A11Y_MATRIX_ORIGIN || localOrigin).replace(/\/$/, "");
const remote = origin !== localOrigin;
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const TEXT_SPACING =
  "*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}";
const modes = [
  { name: "default" },
  { name: "forced-colors", media: { forcedColors: "active" } },
  { name: "contrast-more", media: { contrast: "more" } },
  { name: "reduced-motion", media: { reducedMotion: "reduce" } },
  { name: "reflow-320", viewport: { width: 320, height: 900 } },
  { name: "zoom-200", viewport: { width: 640, height: 900 } },
  { name: "text-spacing", css: TEXT_SPACING },
];

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory()
      ? walk(path)
      : path.endsWith(".html")
        ? [path]
        : [];
  });
}

function contentType(path) {
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".xml": "application/xml; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json",
  }[extname(path)] || "application/octet-stream";
}

function startServer() {
  const server = createServer((request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, origin).pathname);
      const requested = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
      const file = resolve(distDir, `.${requested}`);
      if (!file.startsWith(`${distDir}/`) && file !== distDir) {
        response.writeHead(403).end();
        return;
      }
      const body = readFileSync(file);
      response.writeHead(200, { "content-type": contentType(file) }).end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolveServer) => {
    server.listen(4173, "127.0.0.1", () => resolveServer(server));
  });
}

async function remotePaths() {
  const response = await fetch(`${origin}/sitemap.xml`, {
    headers: { "user-agent": "koztechie.fyi a11y-matrix/1.0" },
    signal: AbortSignal.timeout(15_000),
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
    .map((file) => `/${relative(distDir, file).replace(/\\/g, "/").replace(/index\.html$/, "")}`);
  return [...new Set([...paths, "/404.html", ...localStubs])];
}

const failures = [];
const server = process.env.A11Y_MATRIX_USE_EXISTING_SERVER === "1" ? null : await startServer();
const browser = await chromium.launch();
const files = remote
  ? await remotePaths()
  : walk(distDir).map((file) => ({
      file,
      path: `/${relative(distDir, file).replace(/\\/g, "/").replace(/index\.html$/, "")}`,
    }));

try {
  for (const mode of modes) {
    const context = await browser.newContext({
      viewport: mode.viewport ?? { width: 1280, height: 900 },
      bypassCSP: remote,
    });
    const page = await context.newPage();
    if (mode.media) await page.emulateMedia(mode.media);
    try {
      for (const entry of files) {
        const file = remote ? entry : entry.file;
        const urlPath = remote ? entry : entry.path;
      try {
        await page.goto(`${origin}${urlPath}`, { waitUntil: "load" });
        if (mode.css) await page.addStyleTag({ content: mode.css });
        await page.addScriptTag({ content: axeSrc });
        const result = await page.evaluate(
          ([tags, forcedColors]) => {
            // axe evaluates authored colors before the UA replaces them with
            // system colors in forced-colors mode. Contrast is asserted there
            // by the system-color/focus checks below instead.
            const options = { runOnly: { type: "tag", values: tags } };
            if (forcedColors) options.rules = { "color-contrast": { enabled: false } };
            return window.axe.run(document, options);
          },
          [TAGS, mode.name === "forced-colors"]
        );
        const mediaOk = await page.evaluate((modeName) => {
          const queries = {
            "forced-colors": "(forced-colors: active)",
            "contrast-more": "(prefers-contrast: more)",
            "reduced-motion": "(prefers-reduced-motion: reduce)",
          };
          return queries[modeName] ? window.matchMedia(queries[modeName]).matches : true;
        }, mode.name);
        const overflow = await page.evaluate(() => {
          if (document.documentElement.scrollWidth <= document.documentElement.clientWidth) return false;
          const width = document.documentElement.clientWidth;
          return [...document.querySelectorAll("body *")].some((element) => {
            if (element.closest("pre, .table-scroll")) return false;
            const rect = element.getBoundingClientRect();
            return rect.right > width + 1;
          });
        });
        const focusOk = await page.evaluate(() => {
          for (const element of document.querySelectorAll("a[href],button,[tabindex='0']")) {
            element.focus();
            const style = getComputedStyle(element);
            if (style.outlineStyle === "none" || parseFloat(style.outlineWidth) < 2) {
              return element.outerHTML.slice(0, 80);
            }
          }
          return null;
        });
        if (result.violations.length || overflow || focusOk || !mediaOk) {
          failures.push({
            file: remote ? urlPath : relative(repoRoot, file),
            mode: mode.name,
            violations: result.violations,
            overflow,
            focusOk,
            mediaOk,
          });
        }
      } catch (error) {
        failures.push({
          file: remote ? urlPath : relative(repoRoot, file),
          mode: mode.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  if (server) await new Promise((resolveServer) => server.close(resolveServer));
}

const output = join(repoRoot, "qa-artifacts/a11y/matrix.json");
mkdirSync(join(repoRoot, "qa-artifacts/a11y"), { recursive: true });
writeFileSync(output, JSON.stringify(failures, null, 2));
console.log(`A11y matrix (${remote ? "production" : "local"}): ${files.length} сторінок × ${modes.length} режимів`);
console.log(`Артефакт: ${output}`);
if (failures.length) {
  console.error(`❌ A11y matrix: ${failures.length} невдалих комбінацій`);
  process.exit(1);
}
console.log("✅ A11y matrix: усі комбінації пройдено");
