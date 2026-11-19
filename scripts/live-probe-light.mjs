#!/usr/bin/env node
// Щоденний легкий production probe без сторонніх сервісів і залежностей.

const origin = (process.env.LIVE_PROBE_ORIGIN || "https://koztechie.fyi").replace(/\/$/, "");
const timeoutMs = 10_000;
const checks = [
  "/",
  "/en/",
  "/accessibility/",
  "/en/accessibility/",
  "/.well-known/security.txt",
];
const failures = [];

function fail(message) {
  failures.push(message);
  console.error(`❌ ${message}`);
}

for (const path of checks) {
  const url = `${origin}${path}`;
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "koztechie.fyi light-live-probe/1.0" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status !== 200) {
      fail(`${path}: очікувався 200, отримано ${response.status}`);
      continue;
    }
    if (path !== "/.well-known/security.txt") {
      const hsts = response.headers.get("strict-transport-security") || "";
      if (!hsts.includes("max-age=31536000") || !hsts.includes("includeSubDomains")) {
        fail(`${path}: HSTS неповний`);
      }
    } else {
      const body = await response.text();
      if (!/^Contact:\s*mailto:\S+$/mi.test(body)) {
        fail("security.txt: Contact відсутній");
      }
    }
    console.log(`✅ ${path}: 200`);
  } catch (error) {
    fail(`${path}: ${error.message}`);
  }
}

if (failures.length) {
  console.error(`РЕЗУЛЬТАТ: light-live-probe провалено (${failures.length})`);
  process.exit(1);
}
console.log("РЕЗУЛЬТАТ: light-live-probe пройдено");
