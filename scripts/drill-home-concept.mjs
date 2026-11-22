#!/usr/bin/env node
import assert from "node:assert/strict";
import { auditHomeConcept } from "./home-concept-contract.mjs";

const frame = (concept, lead, brand = "koztechie") => `
  <html><head><title>${brand} — archive</title></head>
  <header><a class="site-logo">${brand}</a></header>
  <article><header class="home-hero">
    <p class="home-concept">${concept}</p>
    <p class="home-lead">${lead}</p>
  </header></article></html>`;

const uk = frame(
  "ВУЗОЛ-0 — внутрішня назва цього цифрового вузла записів і свідчень.",
  "Розділи та нумеровані індекси дають матеріалам межі. Це архів для збереження, а не стрічка для утримання уваги."
);
assert.deepEqual(auditHomeConcept(uk, "uk"), []);

const en = frame(
  "VUZOL-0 is the internal name for this digital node of records and testimony.",
  "Sections and numbered indexes give these materials boundaries. This archive preserves them instead of trying to keep readers scrolling."
);
assert.deepEqual(auditHomeConcept(en, "en"), []);

assert(
  auditHomeConcept(frame("An archive of projects, code, and writing.", "A collection of pages."), "en")
    .some((error) => error.includes("кодова назва"))
);
assert(
  auditHomeConcept(frame(
    "VUZOL-0 is the internal name for this digital node of records and testimony.",
    "Sections and numbered indexes give these materials boundaries. This archive preserves them."
  ), "en").some((error) => error.includes("утримання уваги"))
);
assert(
  auditHomeConcept(frame(en.match(/<p class="home-concept">([\s\S]*?)<\/p>/)[1],
    en.match(/<p class="home-lead">([\s\S]*?)<\/p>/)[1], "VUZOL-0"), "en")
    .some((error) => error.includes("title або шапці"))
);

console.log("✅ home-concept drill: двомовне визначення й механіку прийнято; загальний опис, пропуск механіки та брендування кодовою назвою відхилено.");
