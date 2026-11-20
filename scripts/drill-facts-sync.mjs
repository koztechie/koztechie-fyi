#!/usr/bin/env node
// Негативний дрил: застаріла версія у будь-якому колофоні блокує gate.

import assert from "node:assert/strict";
import { checkFactsSync } from "./facts-sync.mjs";

const packageJson = { dependencies: { "@11ty/eleventy": "3.1.8" } };
const colophons = {
  "content/uk/pages/colophon.md": "- **Eleventy 3.1.7** — генератор статичних сайтів.",
  "content/en/pages/colophon.md": "- **Eleventy 3.1.8** — static site generator.",
};

const mismatch = checkFactsSync({ packageJson, colophons });
assert.equal(mismatch.ok, false, "facts-sync має відхилити seeded mismatch");
assert(mismatch.errors.some((message) => message.includes("3.1.7")));

const aligned = checkFactsSync({
  packageJson,
  colophons: Object.fromEntries(
    Object.entries(colophons).map(([file, text]) => [
      file,
      text.replace("3.1.7", "3.1.8"),
    ])
  ),
});
assert.equal(aligned.ok, true, "facts-sync має прийняти узгоджені версії");

console.log("✅ facts-sync відхиляє seeded mismatch і приймає узгоджені факти.");
