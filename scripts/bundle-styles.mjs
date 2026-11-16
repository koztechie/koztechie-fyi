import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sourceDir = resolve("src/styles");
const outputDir = resolve("dist/styles");
const screenStyles = ["core.css", "layout.css", "components.css", "themes.css"];
const bundle = screenStyles
  .map((file) => `/* ${file} */\n${readFileSync(resolve(sourceDir, file), "utf-8").trim()}`)
  .join("\n\n");
const screenContent = `${bundle}\n`;
const printContent = readFileSync(resolve(sourceDir, "print.css"), "utf-8");
const fingerprint = (content) => createHash("sha256").update(content).digest("hex").slice(0, 12);
const screenFile = `site.${fingerprint(screenContent)}.css`;
const printFile = `print.${fingerprint(printContent)}.css`;

mkdirSync(outputDir, { recursive: true });
writeFileSync(resolve(outputDir, screenFile), screenContent);
writeFileSync(resolve(outputDir, printFile), printContent);

for (const file of readdirSync(outputDir)) {
  if (/^(?:site|print)(?:\.[a-f0-9]{12})?\.css$/.test(file) && file !== screenFile && file !== printFile) {
    unlinkSync(resolve(outputDir, file));
  }
  if (["core.css", "layout.css", "components.css", "themes.css"].includes(file)) {
    unlinkSync(resolve(outputDir, file));
  }
}

function rewriteHtml(directory) {
  for (const entry of readdirSync(directory)) {
    const path = resolve(directory, entry);
    if (statSync(path).isDirectory()) {
      rewriteHtml(path);
    } else if (entry.endsWith(".html")) {
      let html = readFileSync(path, "utf-8");
      if (!html.includes('href="/styles/site.css"') || !html.includes('href="/styles/print.css"')) {
        throw new Error(`Stylesheet references missing before fingerprinting: ${path}`);
      }
      html = html
        .replaceAll('href="/styles/site.css"', `href="/styles/${screenFile}"`)
        .replaceAll('href="/styles/print.css"', `href="/styles/${printFile}"`);
      writeFileSync(path, html);
    }
  }
}

rewriteHtml(resolve("dist"));
console.log(`bundle-styles: ${screenStyles.length} screen styles → ${screenFile}; print → ${printFile}`);
