#!/usr/bin/env node
// Негативний дрил: словоформа «експертом» у запереченні все одно блокується.

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = mkdtempSync(join(tmpdir(), "koztechie-voice-lint-"));
const fixture = join(fixtureRoot, "src", "_data", "strings", "uk.json");
const linter = join(repoRoot, "scripts", "voice-lint.mjs");

try {
  mkdirSync(dirname(fixture), { recursive: true });
  writeFileSync(
    fixture,
    JSON.stringify({ home: { lead: "Я не є експертом у цій сфері." } }, null, 2)
  );

  const result = spawnSync(process.execPath, [linter, fixture], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (result.error) throw result.error;
  if (result.status === 0 || !output.includes("експертом")) {
    console.error(output);
    throw new Error("voice-lint не відхилив заборонену словоформу «експертом» у JSON");
  }
  console.log("✅ voice-lint відхилив «експертом» у JSON, попри заперечення.");
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
