#!/usr/bin/env node
// D-01-ext: контрольна DNS-fixture без DKIM має відхилятися гейтом G-01.

import assert from "node:assert/strict";
import { runEmailDnsGate } from "./email-dns-gate.mjs";

const domain = "fixture.example";
const selector = "zmail";
const txt = new Map([
  [domain, [["v=spf1 include:mail.example ~all"]]],
  [`${selector}._domainkey.${domain}`, []],
  [`_dmarc.${domain}`, [["v=DMARC1; p=quarantine"]]],
]);
const logs = [];
const errors = [];
const exitCode = await runEmailDnsGate({
  domain,
  selector,
  securityUrl: "https://security.fixture.example/.well-known/security.txt",
  resolveMxRecord: async () => [{ priority: 10, exchange: "mx.fixture.example" }],
  resolveTxtRecord: async (query) => {
    if (!txt.has(query)) {
      const error = new Error("fixture record missing");
      error.code = "ENODATA";
      throw error;
    }
    return txt.get(query);
  },
  fetchImpl: async () => new Response("Contact: mailto:ops@fixture.example\n", { status: 200 }),
  log: (message) => logs.push(message),
  errorLog: (message) => errors.push(message),
});

assert.equal(exitCode, 1, "G-01 має завершитися ненульовим кодом без DKIM");
assert(errors.some((message) => message.includes(`DKIM ${selector}._domainkey.${domain} не знайдено`)));
assert(!logs.some((message) => message.includes(`DKIM ${selector}: present`)));
console.log("✅ D-01-ext: fixture без DKIM відхилено гейтом G-01");
