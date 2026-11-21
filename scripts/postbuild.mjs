#!/usr/bin/env node
// postbuild.mjs: прибирає .gitkeep з dist/ після збірки
// .gitkeep позначає порожні теки для git, але не має публікуватися.
// Також: noindex для не-production контекстів Netlify (PLAN 162).
// Використання: node scripts/postbuild.mjs (викликається зі скрипта build)

import { getBuildEpoch, getBuildSha } from "./build-provenance.mjs";
import { readdirSync, statSync, unlinkSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const dist = "dist";
let removed = 0;

function walk(dir) {
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (item === ".gitkeep") {
      unlinkSync(full);
      removed++;
    }
  }
}

try {
  walk(dist);
  console.log(`postbuild: прибрано ${removed} .gitkeep з dist/`);
} catch (e) {
  // dist/ не існує — нема чого прибирати. Не падаємо.
  console.log(`postbuild: ${dist}/ не існує, пропущено`);
}

if (existsSync(dist)) {
  const version = { sha: getBuildSha(), epoch: getBuildEpoch() };
  writeFileSync(join(dist, "version.json"), `${JSON.stringify(version)}\n`);
  console.log(`postbuild: записано version.json для ${version.sha || "невідомого commit"}`);
}

// T-6.1: force directory-index redirects so they win over existing index.html.
// Replace the marked block on every build to keep _redirects deterministic.
const redirectsPath = join(dist, "_redirects");
if (existsSync(redirectsPath)) {
  const startMarker = "# BEGIN generated directory-index redirects (T-6.1)";
  const endMarker = "# END generated directory-index redirects (T-6.1)";
  const current = readFileSync(redirectsPath, "utf-8");
  const generatedStart = current.indexOf(startMarker);
  const generatedEnd = current.indexOf(endMarker, generatedStart);
  let generatedBlockEnd = generatedEnd === -1 ? -1 : generatedEnd + endMarker.length;
  while (generatedBlockEnd !== -1 && current[generatedBlockEnd] === "\n") generatedBlockEnd++;
  const withoutGenerated = generatedStart === -1 || generatedBlockEnd === -1
    ? current.trimEnd()
    : `${current.slice(0, generatedStart)}${current.slice(generatedBlockEnd)}`.trimEnd();
  const indexFiles = [];

  function collectIndexFiles(dir) {
    for (const item of readdirSync(dir).sort()) {
      const full = join(dir, item);
      if (statSync(full).isDirectory()) {
        collectIndexFiles(full);
      } else if (item === "index.html") {
        const path = relative(dist, full).split(sep).join("/");
        if (path !== "index.html") indexFiles.push(path);
      }
    }
  }

  collectIndexFiles(dist);
  indexFiles.sort();
  const rules = indexFiles.map((path) => {
    const directory = path.slice(0, -"index.html".length);
    return `/${path} /${directory} 301!`;
  });
  // These files exist in dist, so force the status-only self-redirects too.
  rules.push("/404.html /404.html 404!", "/en/404.html /en/404.html 404!");
  const block = [startMarker, ...rules, endMarker].join("\n");
  const lines = withoutGenerated.split("\n");
  // Netlify evaluates matching rules in order: put exact forced routes before
  // the broad non-forced /en/* → 404 rule, otherwise that rule shadows them.
  const englishFallback = lines.findIndex((line) => /^\/en\/\*\s/.test(line));
  if (englishFallback === -1) lines.push("", block);
  else lines.splice(englishFallback, 0, block, "");
  writeFileSync(redirectsPath, `${lines.join("\n").trimEnd()}\n`);
  console.log(`postbuild: згенеровано ${indexFiles.length} directory-index 301 та 2 статуси 404`);
}

// PLAN 162: noindex для не-production.
// Netlify встановлює CONTEXT під час збірки: production | deploy-preview |
// branch-deploy | dev. Локально змінної немає = production.
// Заголовок додається окремою секцією /* у кінець dist/_headers — секції
// накладаються (перевірено: /poetry/ отримує і безпеку, і X-Robots-Tag).
const context = process.env.CONTEXT;
const headersPath = join(dist, "_headers");

if (context && context !== "production" && existsSync(headersPath)) {
  const headers = readFileSync(headersPath, "utf-8");
  if (!headers.includes("X-Robots-Tag: noindex")) {
    const addition = [
      "",
      `# Не-production контекст Netlify («${context}», PLAN 162): заборона індексації.`,
      "/*",
      "  X-Robots-Tag: noindex",
      "",
    ].join("\n");
    writeFileSync(headersPath, headers.replace(/\s*$/, "") + addition);
    console.log(`postbuild: контекст «${context}» — додано X-Robots-Tag: noindex у dist/_headers`);
  }
} else {
  console.log(`postbuild: контекст «${context ?? "локально (змінної CONTEXT немає)"}» — production, без noindex`);
}
