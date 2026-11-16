import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readThemeColors, renderPaletteRatioTable } from "./theme-colors.mjs";

const colors = readThemeColors();
const files = [
  ["docs/design-system.md", "uk"],
  ["content/uk/pages/colophon.md", "uk"],
  ["content/en/pages/colophon.md", "en"],
];
const marker = /<!-- PALETTE-RATIOS:START -->[\s\S]*?<!-- PALETTE-RATIOS:END -->/;

for (const [relativePath, language] of files) {
  const path = resolve(relativePath);
  const source = readFileSync(path, "utf8");
  if (!marker.test(source)) {
    throw new Error(`${relativePath}: немає блока PALETTE-RATIOS`);
  }
  const replacement = [
    "<!-- PALETTE-RATIOS:START -->",
    "",
    renderPaletteRatioTable(colors, language),
    "",
    "<!-- PALETTE-RATIOS:END -->",
  ].join("\n");
  const output = source.replace(marker, replacement);
  if (output !== source) writeFileSync(path, output);
}
