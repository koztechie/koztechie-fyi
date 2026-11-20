#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const root = resolve(process.argv[2] || "dist");
const files = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile()) {
      files.push(fullPath);
    } else {
      throw new Error(`Непідтримуваний тип артефакту: ${fullPath}`);
    }
  }
}

walk(root);
files.sort();

const digest = createHash("sha256");
for (const file of files) {
  const path = relative(root, file).split(sep).join("/");
  const content = readFileSync(file);
  const fileSha256 = createHash("sha256").update(content).digest("hex");
  digest.update(JSON.stringify([path, content.length, fileSha256]));
  digest.update("\n");
}

console.log(digest.digest("hex"));
