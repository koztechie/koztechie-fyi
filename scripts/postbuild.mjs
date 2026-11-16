#!/usr/bin/env node
// postbuild.mjs: прибирає .gitkeep з dist/ після збірки
// .gitkeep позначає порожні теки для git, але не має публікуватися.
// Також: noindex для не-production контекстів Netlify (PLAN 162).
// Використання: node scripts/postbuild.mjs (викликається зі скрипта build)

import { readdirSync, statSync, unlinkSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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
