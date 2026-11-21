#!/usr/bin/env node
// Fail closed when generated output contains an unapproved path.

import { readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const distDir = resolve(process.argv[2] || "dist");
const allowed = [
  /(?:^|\/)[^/]+\.html$/,
  /^styles\/(?:site|print)\.[a-f0-9]{12}\.css$/,
  /^og\/[^/]+\.(?:png|svg)$/,
  /^nichlyst\/[^/]+\.webp$/,
  /^img\/[^/]+$/,
  /^favicon\.[^/]+$/,
  /^apple-touch-icon\.png$/,
  /^icon-(?:192|512)\.png$/,
  /^site\.webmanifest$/,
  /^version\.json$/,
  /^feed\.xml$/,
  /^en\/feed\.xml$/,
  /^sitemap\.xml$/,
  /^pages\.json$/,
  /^robots\.txt$/,
  /^humans\.txt$/,
  /^_headers$/,
  /^_redirects$/,
  /^\.well-known\/security\.txt$/,
  /^404\.html$/,
  /^en\/404\.html$/,
];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) return [{ path, symlink: true }];
    return entry.isDirectory() ? walk(path) : [{ path, symlink: false }];
  });
}

let files;
try {
  files = walk(distDir);
} catch (error) {
  console.error(`❌ dist inventory: не вдалося прочитати ${distDir}: ${error.message}`);
  process.exit(1);
}

const unexpected = files
  .map(({ path, symlink }) => ({
    path: relative(distDir, path).split(sep).join("/"),
    symlink,
  }))
  .filter(({ path, symlink }) => symlink || !allowed.some((pattern) => pattern.test(path)));

if (unexpected.length) {
  console.error(`❌ dist inventory: ${unexpected.length} файл(и) поза allowlist:`);
  for (const { path, symlink } of unexpected) {
    console.error(`  - ${path}${symlink ? " (symlink заборонено)" : ""}`);
  }
  process.exit(1);
}

console.log(`✅ dist inventory: ${files.length} файлів у allowlist`);
