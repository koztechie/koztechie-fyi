#!/usr/bin/env node

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const fixture = mkdtempSync(join(tmpdir(), "koztechie-scroll-labels-"));
const source = resolve("dist");
const target = join(fixture, "dist");

try {
  cpSync(source, target, { recursive: true });
  const file = join(target, "en/colophon/index.html");
  const html = readFileSync(file, "utf8").replace(
    'aria-label="Table (scrollable)"',
    'aria-label="Таблиця (прокрутка)"',
  );
  writeFileSync(file, html);

  try {
    execFileSync(process.execPath, ["scripts/check.mjs", target], {
      stdio: "pipe",
      encoding: "utf8",
    });
  } catch (error) {
    const output = `${error.stdout || ""}${error.stderr || ""}`;
    if (output.includes("en/colophon/index.html") && output.includes("Table (scrollable)")) {
      console.log("✅ Chaos: неправильна мова scroll-label відхилена guard 7н");
      process.exit(0);
    }
    console.error(output);
    process.exit(1);
  }

  console.error("❌ Chaos: guard 7н пропустив неправильну мову scroll-label");
  process.exit(1);
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
