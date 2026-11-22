import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { auditCompositionSignature } from "./composition-signature-contract.mjs";

const files = {
  core: "src/styles/core.css",
  layout: "src/styles/layout.css",
  components: "src/styles/components.css",
  post: "src/templates/post.njk",
  poetry: "src/templates/poetry.njk",
  practice: "src/templates/case.njk",
};
const source = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

assert.deepEqual(auditCompositionSignature(source), []);
const weakened = {
  ...source,
  layout: source.layout.replace(
    /\.index-entry__number\s*\{([^}]*)--serial-mark/g,
    ".index-entry__number {$1--text-sm"
  ),
};
assert(
  auditCompositionSignature(weakened).some((error) => error.includes(".index-entry__number")),
  "гейт має відхиляти втрату масштабу серійного номера"
);
const collapsed = {
  ...source,
  post: source.post.replaceAll('class="entry-line__number"', 'class="entry-number"'),
};
assert(
  auditCompositionSignature(collapsed).some((error) => error.includes("post.njk")),
  "гейт має відхиляти злиття підпису та номера запису"
);
console.log("✅ composition-signature drill: спільний номерний ритм прийнято; його згортання відхилено.");
