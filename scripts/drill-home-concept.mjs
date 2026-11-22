#!/usr/bin/env node
import assert from "node:assert/strict";
import { auditHomeConcept } from "./home-concept-contract.mjs";

const frame = (concept, lead, brand = "koztechie", thesis = "An archive of projects, decisions, and mistakes.") => `
  <html><head><title>${brand} — archive</title></head>
  <header><a class="site-logo">${brand}</a></header>
  <article><header class="home-hero">
    <h1>${thesis}</h1>
    <p class="home-concept">${concept}</p>
    <p class="home-lead">${lead}</p>
    <p class="meta-line">Eugene Kozlovsky</p>
  </header></article></html>`;

const uk = frame(
  "ВУЗОЛ-0 — внутрішня назва цього цифрового вузла записів і свідчень.",
  "Розділи та нумеровані індекси дають матеріалам межі. Це архів для збереження, а не стрічка для утримання уваги.",
  "koztechie",
  "Архів проєктів, рішень і помилок."
);
assert.deepEqual(auditHomeConcept(uk, "uk"), []);

const en = frame(
  "VUZOL-0 is the internal name for this digital node of records and testimony.",
  "Sections and numbered indexes give these materials boundaries. This archive preserves them instead of trying to keep readers scrolling."
);
assert.deepEqual(auditHomeConcept(en, "en"), []);

assert(
  auditHomeConcept(frame("An archive of projects, code, and writing.", "A collection of pages."), "en")
    .some((error) => error.includes("внутрішня назва"))
);
assert(
  auditHomeConcept(frame(
    "VUZOL-0 is the internal name for this digital node of records and testimony.",
    "Sections and numbered indexes give these materials boundaries. This archive preserves them."
  ), "en").some((error) => error.includes("утримання уваги"))
);
assert(
  auditHomeConcept(frame(en.match(/<p class="home-concept">([\s\S]*?)<\/p>/)[1],
    en.match(/<p class="home-lead">([\s\S]*?)<\/p>/)[1], "koztechie",
    "AI-assisted developer and systems architect"), "en")
    .some((error) => error.includes("головний h1"))
);
assert(
  auditHomeConcept(frame(
    en.match(/<p class="home-concept">([\s\S]*?)<\/p>/)[1],
    en.match(/<p class="home-lead">([\s\S]*?)<\/p>/)[1],
    "koztechie",
    "An archive of projects, decisions, and mistakes."
  ).replace(/<h1>[\s\S]*?<\/h1>\s*<p class="home-concept">/, '<p class="meta-line">AI-assisted developer</p><h1>An archive of projects, decisions, and mistakes.</h1><p class="home-concept">'), "en")
    .some((error) => error.includes("випереджати тезу"))
);
assert(
  auditHomeConcept(frame(en.match(/<p class="home-concept">([\s\S]*?)<\/p>/)[1],
    en.match(/<p class="home-lead">([\s\S]*?)<\/p>/)[1], "VUZOL-0"), "en")
    .some((error) => error.includes("title або шапці"))
);

console.log("✅ home-concept drill: змістовну тезу, її першість і двомовну концепцію прийнято; рольове позиціювання, загальний опис, пропуск механіки та кодову назву брендом відхилено.");
