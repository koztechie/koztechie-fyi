#!/usr/bin/env node
// G-01: мінімальна DNS-перевірка каналу зв'язку.

import { resolveMx, resolveTxt } from "node:dns/promises";

const domain = (process.env.EMAIL_DNS_DOMAIN || "koztechie.fyi").replace(/\.$/, "");
const securityUrl = process.env.EMAIL_SECURITY_URL
  || `https://${domain}/.well-known/security.txt`;
const timeoutMs = 15_000;
let errors = 0;

function fail(message) {
  console.error(`❌ ${message}`);
  errors++;
}

async function records(query, type) {
  try {
    return await (type === "MX" ? resolveMx(query) : resolveTxt(query));
  } catch (error) {
    fail(`${type} ${query}: ${error.code || error.message}`);
    return [];
  }
}

console.log("=== EMAIL-DNS-GATE (G-01) ===");
console.log(`Domain: ${domain}`);

const mx = await records(domain, "MX");
if (mx.length) console.log(`✅ MX: ${mx.map((record) => `${record.priority} ${record.exchange}`).join(", ")}`);
else fail(`${domain}: MX не знайдено`);

const spf = (await records(domain, "TXT"))
  .map((parts) => parts.join(""))
  .find((value) => /^v=spf1(?:\s|$)/i.test(value));
if (spf) console.log(`✅ SPF: ${spf}`);
else fail(`${domain}: SPF TXT не знайдено`);

const dmarc = (await records(`_dmarc.${domain}`, "TXT"))
  .map((parts) => parts.join(""))
  .find((value) => /^v=DMARC1(?:\s|;|$)/i.test(value));
if (dmarc) console.log(`✅ DMARC: ${dmarc}`);
else fail(`${domain}: _dmarc TXT не знайдено`);

try {
  const response = await fetch(securityUrl, {
    headers: { "user-agent": "koztechie.fyi email-dns-gate/1.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.text();
  const contact = body.match(/^Contact:\s*(mailto:\S+)$/mi)?.[1];
  if (!response.ok || !contact || !/^mailto:[^@\s]+@[^@\s]+$/i.test(contact)) {
    fail(`security.txt Contact невалідний (${response.status})`);
  } else {
    console.log(`✅ security.txt Contact: ${contact}`);
  }
} catch (error) {
  fail(`security.txt: ${error.message}`);
}

if (errors) {
  console.error(`РЕЗУЛЬТАТ: G-01 провалено (${errors} помилок)`);
  process.exit(1);
}
console.log("РЕЗУЛЬТАТ: G-01 пройдено");
