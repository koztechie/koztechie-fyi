#!/usr/bin/env node
// Перевіряє суворий provenance gate і вузький legacy-режим після rollback.

import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(".");
const probe = resolve(root, "scripts/live-probe-light.mjs");
const sha = "a".repeat(40);
let versionMode = "valid";
const pages = new Set([
  "/",
  "/en/",
  "/accessibility/",
  "/en/accessibility/",
  "/colophon/",
  "/en/colophon/",
  "/contact/",
  "/en/contact/",
  "/manifest/",
  "/en/manifest/",
  "/privacy/",
  "/en/privacy/",
]);

const server = createServer((request, response) => {
  const path = new URL(request.url || "/", "http://fixture").pathname;
  const headers = {
    "cache-control": "public,max-age=0,must-revalidate",
    "content-security-policy":
      "default-src 'self'; style-src 'self'; script-src 'none'; frame-ancestors 'none'",
    "strict-transport-security": "max-age=31536000; includeSubDomains",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
  const send = (status, body = "", extra = {}) => {
    response.writeHead(status, { ...headers, ...extra });
    response.end(body);
  };

  if (path === "/version.json") {
    if (versionMode === "missing") return send(404, "Not found");
    const version =
      versionMode === "invalid" ? { sha: "not-a-commit" } : { sha };
    return send(200, JSON.stringify(version), {
      "content-type": "application/json",
    });
  }
  if (path === "/.well-known/security.txt") {
    return send(200, "Contact: mailto:security@example.test\n");
  }
  if (pages.has(path)) {
    const html = `<!doctype html><html><head><meta name="x-commit" content="${sha}"><link rel="stylesheet" href="/styles/site.123456789abc.css"></head><body><main>Fixture</main></body></html>`;
    return send(200, html, { "content-type": "text/html; charset=utf-8" });
  }
  if (path === "/styles/site.123456789abc.css") {
    return send(200, ":root{--paper:#fff}", {
      "cache-control": "public,max-age=31536000,immutable",
      "content-type": "text/css; charset=utf-8",
    });
  }
  const redirects = new Map([
    ["/index.html", "/"],
    ["/blog/index.html", "/blog/"],
    ["/en/index.html", "/en/"],
  ]);
  if (redirects.has(path)) {
    return send(301, "", { location: redirects.get(path) });
  }
  if (path === "/feed.xml") {
    return send(200, "<rss/>", { "content-type": "application/rss+xml" });
  }
  return send(404, "Not found");
});

await new Promise((resolveListen, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolveListen);
});

async function runProbe({ expectedSha = "", allowLegacy = false } = {}) {
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return await new Promise((resolveRun) => {
    const child = spawn(process.execPath, [probe], {
      env: {
        ...process.env,
        LIVE_PROBE_ORIGIN: `http://127.0.0.1:${address.port}`,
        LIVE_PROBE_PREVIOUS_CSS: "",
        EXPECTED_COMMIT_SHA: expectedSha,
        LIVE_PROBE_ALLOW_LEGACY_PROVENANCE: allowLegacy ? "1" : "",
      },
    });
    let output = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, 20_000);
    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk) => {
      output += chunk;
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      resolveRun({ status: 1, output: `${output}${error.message}` });
    });
    child.once("close", (status) => {
      clearTimeout(timer);
      resolveRun({
        status: timedOut ? 1 : status,
        output: timedOut ? `${output}Probe timed out` : output,
      });
    });
  });
}

try {
  let result = await runProbe({ expectedSha: sha });
  assert.equal(result.status, 0, result.output);

  result = await runProbe({ expectedSha: "b".repeat(40) });
  assert.notEqual(result.status, 0, "Probe прийняв невідповідний version.json SHA");
  assert.match(result.output, /version\.json SHA/);

  versionMode = "missing";
  result = await runProbe({ allowLegacy: true });
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /legacy rollback-режимі/);

  result = await runProbe();
  assert.notEqual(result.status, 0, "Probe прийняв відсутній version.json без дозволу");
  assert.match(result.output, /version\.json: очікувався 200/);

  versionMode = "invalid";
  result = await runProbe({ allowLegacy: true });
  assert.notEqual(result.status, 0, "Legacy-режим проковтнув невалідний version.json");
  assert.match(result.output, /commit SHA не задано або він невалідний/);

  console.log(
    "✅ LIVE-PROBE DRILL: звичайний provenance суворий; legacy-дозвіл діє лише для відсутнього version.json після rollback",
  );
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
}
