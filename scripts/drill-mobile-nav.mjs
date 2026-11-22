import assert from "node:assert/strict";
import { auditMobileNav } from "./mobile-nav-contract.mjs";

const css = `
@media (max-width: 72rem) {
  .site-nav {
    display: flex;
    min-width: 0;
    max-width: 100%;
    overflow-x: auto;
  }
  .site-nav a {
    flex: 0 0 auto;
    white-space: nowrap;
  }
}
`;
const html = '<nav class="site-nav"><a href="/nichlyst/">NICHLYST</a><a href="/blog/">Blog</a><a href="/cemetery/">Cemetery</a><a href="/poetry/">Poetry</a></nav>';

assert.deepEqual(auditMobileNav({ css, html }), []);
assert.ok(auditMobileNav({ css: css.replace("overflow-x: auto;", "flex-wrap: wrap;"), html }).length);
assert.ok(auditMobileNav({ css: css.replace("white-space: nowrap;", "white-space: normal;"), html }).length);
assert.ok(auditMobileNav({ css, html: html.replace('<a href="/poetry/">Poetry</a>', "") }).length);
console.log("✅ mobile-nav drill: горизонтальну прокрутку без прихованих пунктів прийнято; wrap, перенесення й пропуск пункту відхилено.");
