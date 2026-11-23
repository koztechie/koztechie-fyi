#!/usr/bin/env node
import assert from "node:assert/strict";
import { auditHomePassport } from "./home-passport-contract.mjs";

const frame = (title, rows) => `
  <section class="home-panel home-panel--passport">
    <h2>${title}</h2>
    <div class="passport"><dl>
      ${rows.map(([label, value]) => `<div class="row"><dt>${label}</dt><dd>${value}</dd></div>`).join("")}
    </dl></div>
  </section>`;

const ukRows = [
  ["Записів в архіві", "5"],
  ["Бюджет сторінки", "≤ 50 КіБ, Brotli"],
  ["Оновлено", "23 листопада 2026 року"],
];
const enRows = [
  ["Archive entries", "5"],
  ["Page budget", "≤ 50 KiB, Brotli"],
  ["Updated", "November 23, 2026"],
];

assert.deepEqual(auditHomePassport(frame("Про сайт", ukRows), "uk"), []);
assert.deepEqual(auditHomePassport(frame("About this site", enRows), "en"), []);
assert(
  auditHomePassport(frame("Про сайт", [
    ["Публічних сторінок", "32"],
    ...ukRows.slice(1),
  ]), "uk").some((error) => error.includes("кількість записів"))
);
assert(
  auditHomePassport(frame("About this site", [
    ["Public pages", "32"],
    ...enRows.slice(1),
  ]), "en").some((error) => error.includes("кількість записів"))
);
assert(
  auditHomePassport(frame("Про автора і сайт", ukRows), "uk")
    .some((error) => error.includes("описувати сайт"))
);
assert(
  auditHomePassport(frame("Про сайт", [
    ...ukRows,
    ["Псевдонім", "koztechie"],
  ]), "uk").some((error) => error.includes("рівно три"))
);
assert(
  auditHomePassport(frame("About this site", [
    ["Author", "Eugene Kozlovsky"],
    ...enRows.slice(1),
  ]), "en").some((error) => error.includes("дублювати автора"))
);

console.log("✅ home-passport drill: сайтова трійка дозволена; авторські повтори й зайвий рядок відхилено.");
