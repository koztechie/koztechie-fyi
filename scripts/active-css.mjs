import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export function selectActiveCssFiles(distDir, cssFiles) {
  const htmlPath = join(distDir, "index.html");
  const activeNames = existsSync(htmlPath)
    ? [...readFileSync(htmlPath, "utf8").matchAll(/href="\/styles\/((?:site|print)\.[a-f0-9]{12}\.css)"/g)]
      .map((match) => match[1])
    : [];

  if (activeNames.length > 0) {
    return cssFiles.filter((file) => activeNames.includes(file.split("/").pop()));
  }

  const newest = (prefix) => cssFiles
    .filter((file) => new RegExp(`/${prefix}\\.[a-f0-9]{12}\\.css$`).test(file))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];

  return [newest("site"), newest("print")].filter(Boolean);
}
