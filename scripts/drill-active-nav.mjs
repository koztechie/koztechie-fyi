import assert from "node:assert/strict";
import { auditActiveNav } from "./active-nav-contract.mjs";

const template = '<a aria-current="page"><span class="site-nav__label">Blog</span></a>';
const css = `
.site-nav a[aria-current="page"] .site-nav__label {
  color: var(--night);
  background: var(--accent-night);
  font: 700 0.82em / 1.35 var(--font-mono);
}
.site-nav a[aria-current="page"] .site-nav__label::before { content: "[ "; }
.site-nav a[aria-current="page"] .site-nav__label::after { content: " ]"; }
`;
const html = '<nav class="site-nav"><a aria-current="page"><span class="site-nav__label">Blog</span></a></nav>';

assert.deepEqual(auditActiveNav({ template, css, html }), []);
assert.ok(auditActiveNav({ template, css: css.replace("background: var(--accent-night);", "background: transparent;"), html }).length);
assert.ok(auditActiveNav({ template, css: css.replace("var(--font-mono)", "var(--font-ui)"), html }).length);
assert.ok(auditActiveNav({ template, css, html: '<nav class="site-nav"><a>Blog</a></nav>' }).length);
console.log("✅ active-nav drill: контрастна моно-мітка прийнята; прозоре тло, гротеск і відсутній стан відхилено.");
