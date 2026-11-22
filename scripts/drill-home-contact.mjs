#!/usr/bin/env node
import assert from "node:assert/strict";
import { auditHomeContactHierarchy } from "./home-contact-contract.mjs";

const frame = (hero, contact = '<a href="/contact/">Контакт</a>') => `
  <article class="home">
    <header class="home-hero">${hero}</header>
    <ul class="home-sections-list"><li>${contact}</li></ul>
  </article>`;

const plainInlineContact = frame(
  '<p class="home-lead">Запитання — <a href="/contact/">контакт</a>.</p>'
);
assert.deepEqual(auditHomeContactHierarchy(plainInlineContact, "uk"), []);

const standaloneAction = frame(
  '<p class="home-lead">Архів.</p><p><a href="/contact/">Написати листа</a></p>'
);
assert(
  auditHomeContactHierarchy(standaloneAction, "uk")
    .some((error) => error.includes("окреме посилання"))
);

const styledAction = frame(
  '<p class="home-lead"><a class="letter-cta" href="/contact/">Контакт</a></p>'
);
assert(
  auditHomeContactHierarchy(styledAction, "uk")
    .some((error) => error.includes("клас"))
);

const semanticButton = frame(
  '<p class="home-lead"><button type="button">Написати</button></p>'
);
assert(
  auditHomeContactHierarchy(semanticButton, "uk")
    .some((error) => error.includes("роллю кнопки"))
);

const missingDirectoryLink = frame(
  '<p class="home-lead">Архів.</p>',
  '<a href="/blog/">Блог</a>'
);
assert(
  auditHomeContactHierarchy(missingDirectoryLink, "uk")
    .some((error) => error.includes("індексі розділів"))
);

const englishHome = frame(
  '<p class="home-lead">An archive.</p>',
  '<a href="/en/contact/">Contact</a>'
);
assert.deepEqual(auditHomeContactHierarchy(englishHome, "en"), []);

console.log("✅ home-contact drill: заборонений CTA відхилено; inline-контактний лінк і звичайний лінк в індексі дозволені.");
