import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { auditPageExperience } from "./page-experience-contract.mjs";

const files = {
  layout: "src/styles/layout.css",
  components: "src/styles/components.css",
  home: "src/templates/home.njk",
  list: "src/templates/list.njk",
  post: "src/templates/post.njk",
  practice: "src/templates/case.njk",
  cemetery: "src/templates/cemetery-entry.njk",
  poetry: "src/templates/poetry.njk",
  page: "src/templates/page.njk",
  now: "src/templates/now.njk",
  project: "src/templates/project.njk",
  stub: "src/templates/stub.njk",
  notFound: "src/404.njk",
};
const source = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

assert.deepEqual(auditPageExperience(source), []);

const arbitraryHomeHeadingWrap = {
  ...source,
  layout: source.layout.replace(
    /\.home-hero h1\s*\{[^}]*\}/,
    ".home-hero h1 { max-width: 10ch; overflow-wrap: anywhere; }"
  ),
};
assert(
  auditPageExperience(arbitraryHomeHeadingWrap).some((error) =>
    error.includes("H1 головної")
  ),
  "гейт має відхиляти вузьку ch-ширину й довільний розрив H1 головної"
);

const narrowMobileHomeHeading = {
  ...source,
  layout: source.layout.replace(
    /(\.home-hero h1\s*\{[^}]*\})([\s\S]*?)(\.home-hero h1\s*\{[^}]*\})/,
    "$1$2.home-hero h1 { max-width: 11ch; }"
  ),
};
assert(
  auditPageExperience(narrowMobileHomeHeading).some((error) =>
    error.includes("H1 головної")
  ),
  "гейт має відхиляти повернення ch-обмеження у вузькому breakpoint"
);

const flattenedPoem = {
  ...source,
  components: source.components
    .replace(/\.entry-body\.poetry\s*\{[^}]*\}/, ".entry-body.poetry {}")
    .replace(/\.entry-body\.poetry\s*\{[^}]*\}/, ".entry-body.poetry {}"),
};
assert(
  auditPageExperience(flattenedPoem).some((error) => error.includes("ритм рядків")),
  "гейт має відхиляти згортання поетичного ритму в загальний текст"
);

const genericCemetery = {
  ...source,
  cemetery: source.cemetery.replaceAll("closed-record-epitaph", "generic-summary"),
};
assert(
  auditPageExperience(genericCemetery).some((error) => error.includes("епітафії")),
  "гейт має відхиляти злиття фактів завершення з голосом епітафії"
);

const crampedPageDate = {
  ...source,
  layout: source.layout.replace(
    /\.page-updated\s*\{[^}]*\}/,
    ".page-updated { grid-column: 1; }"
  ),
};
assert(
  auditPageExperience(crampedPageDate).some((error) => error.includes("вузькій маргіналії")),
  "гейт має відхиляти повернення довгої дати у вузьку маргіналію"
);

const implicitMobileColumn = {
  ...source,
  layout: source.layout.replace(
    /\.entry-header \.entry-meta,\s*\.closed-record-header > \.entry-line/,
    ".entry-header .entry-meta { grid-column: 2; }\n  .closed-record-header > .entry-line"
  ),
};
assert(
  auditPageExperience(implicitMobileColumn).some((error) => error.includes("одноколонковий reflow")),
  "гейт має відхиляти implicit-колонку метаданих у вузькому заголовку допису"
);

const flattenedCase = {
  ...source,
  layout: source.layout.replace(/\.case-body h2::before\s*\{[^}]*\}/, ".case-body h2::before {}"),
};
assert(
  auditPageExperience(flattenedCase).some((error) => error.includes("послідовність секцій")),
  "гейт має відхиляти втрату послідовності кейсу"
);

console.log("✅ page-experience drill: архетипи збережено; їхнє зведення до загального шаблону відхилено.");
