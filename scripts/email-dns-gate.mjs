#!/usr/bin/env node
// G-01: мінімальна DNS-перевірка каналу зв'язку.

import { resolveMx, resolveTxt } from "node:dns/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function runEmailDnsGate({
  domain = (process.env.EMAIL_DNS_DOMAIN || "koztechie.fyi").replace(/\.$/, ""),
  selector = process.env.EMAIL_DKIM_SELECTOR || "zmail",
  securityUrl = process.env.EMAIL_SECURITY_URL || `https://${domain}/.well-known/security.txt`,
  resolveMxRecord = resolveMx,
  resolveTxtRecord = resolveTxt,
  fetchImpl = fetch,
  log = console.log,
  errorLog = console.error,
} = {}) {
  const timeoutMs = 15_000;
  let errors = 0;

  function fail(message) {
    errorLog(`❌ ${message}`);
    errors++;
  }

  async function records(query, type) {
    try {
      return await (type === "MX" ? resolveMxRecord(query) : resolveTxtRecord(query));
    } catch (error) {
      fail(`${type} ${query}: ${error.code || error.message}`);
      return [];
    }
  }

  log("=== EMAIL-DNS-GATE (G-01) ===");
  log(`Domain: ${domain}`);

  const mx = await records(domain, "MX");
  if (mx.length) log(`✅ MX: ${mx.map((record) => `${record.priority} ${record.exchange}`).join(", ")}`);
  else fail(`${domain}: MX не знайдено`);

  const spf = (await records(domain, "TXT"))
    .map((parts) => parts.join(""))
    .find((value) => /^v=spf1(?:\s|$)/i.test(value));
  if (spf) log(`✅ SPF: ${spf}`);
  else fail(`${domain}: SPF TXT не знайдено`);

  const dkim = (await records(`${selector}._domainkey.${domain}`, "TXT"))
    .map((parts) => parts.join(""))
    .find((value) => /^v=DKIM1/i.test(value));
  if (dkim) log(`✅ DKIM ${selector}: present`);
  else fail(`DKIM ${selector}._domainkey.${domain} не знайдено`);

  const dmarc = (await records(`_dmarc.${domain}`, "TXT"))
    .map((parts) => parts.join(""))
    .find((value) => /^v=DMARC1(?:\s|;|$)/i.test(value));
  if (dmarc) log(`✅ DMARC: ${dmarc}`);
  else fail(`${domain}: _dmarc TXT не знайдено`);

  try {
    const response = await fetchImpl(securityUrl, {
      headers: { "user-agent": "koztechie.fyi email-dns-gate/1.0" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await response.text();
    const contact = body.match(/^Contact:\s*(mailto:\S+)$/mi)?.[1];
    if (!response.ok || !contact || !/^mailto:[^@\s]+@[^@\s]+$/i.test(contact)) {
      fail(`security.txt Contact невалідний (${response.status})`);
    } else {
      log(`✅ security.txt Contact: ${contact}`);
    }
  } catch (error) {
    fail(`security.txt: ${error.message}`);
  }

  if (errors) {
    errorLog(`РЕЗУЛЬТАТ: G-01 провалено (${errors} помилок)`);
    return 1;
  }
  log("РЕЗУЛЬТАТ: G-01 пройдено");
  return 0;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  const exitCode = await runEmailDnsGate();
  if (exitCode) process.exitCode = exitCode;
}
