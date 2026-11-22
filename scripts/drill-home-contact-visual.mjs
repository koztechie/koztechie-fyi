#!/usr/bin/env node
import assert from "node:assert/strict";
import { auditHomeContactVisualPriority } from "./home-contact-visual-contract.mjs";

const style = {
  color: "rgb(0, 0, 0)",
  backgroundColor: "rgba(0, 0, 0, 0)",
  fontFamily: "system-ui",
  fontSize: "16px",
  fontWeight: "400",
  borderBottomWidth: "0px",
};
const links = [
  { path: "/manifest/", style },
  { path: "/practice/", style },
  { path: "/contact/", style },
];
assert.deepEqual(auditHomeContactVisualPriority(links, "/contact/"), []);

const visuallyEmphasized = links.map((link) =>
  link.path === "/contact/"
    ? {
        ...link,
        style: { ...style, backgroundColor: "rgb(0, 0, 0)", fontWeight: "700" },
      }
    : link
);
assert(
  auditHomeContactVisualPriority(visuallyEmphasized, "/contact/")
    .some((error) => error.includes("окрему візуальну вагу"))
);

assert(
  auditHomeContactVisualPriority(links, "/en/contact/")
    .some((error) => error.includes("відсутній"))
);
console.log("✅ home-contact visual drill: рівний контакт дозволено; візуально підсилений і відсутній — відхилено.");
