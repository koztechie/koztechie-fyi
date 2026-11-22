#!/usr/bin/env node
// Переконується, що plan-lint виявляє посилання на відсутній крок.
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(".");
const fixture = mkdtempSync(join(tmpdir(), "plan-lint-drill-"));
const docs = join(fixture, "docs");
mkdirSync(docs, { recursive: true });

try {
  writeFileSync(join(docs, "PLAN.md"), readFileSync(join(root, "docs/PLAN.md")));
  writeFileSync(join(docs, "DECISIONS.md"), readFileSync(join(root, "docs/DECISIONS.md")));
  writeFileSync(join(docs, "STATE.md"), readFileSync(join(root, "docs/STATE.md")));
  writeFileSync(join(fixture, "README.md"), readFileSync(join(root, "README.md")));
  writeFileSync(join(fixture, "AGENTS.md"), readFileSync(join(root, "AGENTS.md")));
  writeFileSync(join(docs, "seeded-reference.md"), "Фікстура з неіснуючим PLAN 488.\n");

  const result = spawnSync(
    process.execPath,
    [join(root, "scripts/plan-lint.mjs"), join(docs, "PLAN.md")],
    { encoding: "utf8" }
  );
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.status === 0 || !output.includes("PLAN 488")) {
    console.error("❌ PLAN-LINT DRILL: не виявлено seeded-посилання PLAN 488");
    console.error(output);
    process.exitCode = 1;
  } else {
    console.log("✅ PLAN-LINT DRILL: seeded-посилання PLAN 488 відхилено");
  }
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
