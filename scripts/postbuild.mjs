#!/usr/bin/env node
// postbuild.mjs: прибирає .gitkeep з dist/ після збірки
// .gitkeep позначає порожні теки для git, але не має публікуватися.
// Використання: node scripts/postbuild.mjs (викликається зі скрипта build)

import { readdirSync, statSync, unlinkSync } from "node:fs";
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
