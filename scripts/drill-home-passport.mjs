#!/usr/bin/env node
import assert from "node:assert/strict";
import { auditHomePassport, auditPageBudgetColophon } from "./home-passport-contract.mjs";

const frame = (title, rows) => `
  <section class="home-panel home-panel--passport">
    <h2>${title}</h2>
    <div class="passport"><dl>
      ${rows.map(([label, value]) => `<div class="row"><dt>${label}</dt><dd>${value}</dd></div>`).join("")}
    </dl></div>
  </section>`;

const ukRows = [
  ["Записів в архіві", "5"],
  ["Останнє оновлення архіву", "23 листопада 2026 року"],
];
const enRows = [
  ["Archive entries", "5"],
  ["Archive last updated", "November 23, 2026"],
];

assert.deepEqual(auditHomePassport(frame("Про сайт", ukRows), "uk"), []);
assert.deepEqual(auditHomePassport(frame("About this site", enRows), "en"), []);
assert(
  auditHomePassport(frame("Про сайт", [
    ["Записів в архіві", "5"],
    ["Оновлено", "23 листопада 2026 року"],
  ]), "uk").some((error) => error.includes("останнього оновлення архіву"))
);
assert(
  auditHomePassport(frame("About this site", [
    ["Archive entries", "5"],
    ["Updated", "November 23, 2026"],
  ]), "en").some((error) => error.includes("називати дату"))
);
assert(
  auditHomePassport(frame("Про сайт", [
    ["Публічних сторінок", "32"],
    ...ukRows.slice(1),
  ]), "uk").some((error) => error.includes("лічильник записів"))
);
assert(
  auditHomePassport(frame("About this site", [
    ["Public pages", "32"],
    ...enRows.slice(1),
  ]), "en").some((error) => error.includes("лічильник записів"))
);
assert(
  auditHomePassport(frame("Про сайт", [
    ...ukRows,
    ["Бюджет сторінки", "≤ 50 КіБ, Brotli"],
  ]), "uk").some((error) => error.includes("лише лічильник"))
);
assert.deepEqual(
  auditPageBudgetColophon(
    "<h2>Бюджет ваги сторінки</h2><p>Ліміт — 50 КіБ. Brotli (якість 11).</p>",
    "uk"
  ),
  []
);
assert.deepEqual(
  auditPageBudgetColophon(
    "<h2>Page-weight budget</h2><p>Limit: 50 KiB per page. Brotli (quality 11).</p>",
    "en"
  ),
  []
);
assert(
  auditPageBudgetColophon("<h2>Page-weight budget</h2><p>Fast pages.</p>", "en").length > 0
);
assert(
  auditHomePassport(frame("Про автора і сайт", ukRows), "uk")
    .some((error) => error.includes("описувати сайт"))
);
assert(
  auditHomePassport(frame("Про сайт", [
    ...ukRows,
    ["Псевдонім", "koztechie"],
  ]), "uk").some((error) => error.includes("лише лічильник"))
);
assert(
  auditHomePassport(frame("About this site", [
    ["Author", "Eugene Kozlovsky"],
    ...enRows.slice(1),
  ]), "en").some((error) => error.includes("дублювати автора"))
);

console.log("✅ home-passport drill: запис, дата архіву й винесений до колофона Brotli-бюджет перевірено двома мовами.");
