import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { readThemeColors } from "./theme-colors.mjs";

const imageDir = resolve("dist/og");
const maxBytes = 15 * 1024;

if (!statSync(imageDir, { throwIfNoEntry: false })?.isDirectory()) {
  throw new Error("dist/og/ не знайдено. Спочатку виконай збірку Eleventy.");
}

function run(command, args) {
  try {
    execFileSync(command, args, { stdio: "ignore" });
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function runImageMagick(args) {
  return run("magick", args) || run("convert", args);
}

const tempDir = mkdtempSync(join(imageDir, ".optimize-"));
const themeColors = readThemeColors();
const svgFiles = filesUnder(imageDir).filter((file) => file.endsWith(".svg"));
for (const file of svgFiles) {
  const source = readFileSync(file, "utf8");
  const output = source
    .replaceAll("{{THEME_PAPER}}", themeColors.paper)
    .replaceAll("{{THEME_ACCENT}}", themeColors.accent)
    .replaceAll("{{THEME_INK}}", themeColors.ink)
    .replaceAll("{{THEME_INK_DIM}}", themeColors["ink-dim"])
    .replaceAll("{{THEME_RULE_SOFT}}", themeColors["rule-soft"])
    .replaceAll("{{THEME_RULE_STRONG}}", themeColors["rule-strong"])
    .replaceAll("{{THEME_NIGHT}}", themeColors.night)
    .replaceAll("{{THEME_RULE_SOFT_NIGHT}}", themeColors["rule-soft-night"])
    .replaceAll("{{THEME_TEXT_NIGHT}}", themeColors["text-night"])
    .replaceAll("{{THEME_TEXT_DIM}}", themeColors["text-dim"])
    .replaceAll("{{THEME_ACCENT_NIGHT}}", themeColors["accent-night"]);
  const withNightRule = output.replaceAll("{{THEME_RULE_STRONG_NIGHT}}", themeColors["rule-strong-night"]);
  if (withNightRule.includes("{{THEME_")) {
    throw new Error(`${file.slice(imageDir.length + 1)}: невідомий маркер кольору.`);
  }
  if (withNightRule !== source) writeFileSync(file, withNightRule);
}

for (const svgFile of svgFiles) {
  const name = svgFile.slice(imageDir.length + 1).replace(/\.svg$/, "");
  const renderedFile = join(tempDir, `${name}-v2.png`);
  if (!runImageMagick([
    svgFile,
    "-background", themeColors.paper,
    "-alpha", "remove",
    "-alpha", "off",
    renderedFile,
  ])) {
    throw new Error(`Для генерації OG-картки ${name} потрібен системний ImageMagick.`);
  }
  renameSync(renderedFile, join(imageDir, `${name}-v2.png`));
}

const pngFiles = readdirSync(imageDir)
  .filter((file) => file.toLowerCase().endsWith(".png"))
  .map((file) => join(imageDir, file));
if (!pngFiles.length) throw new Error("У dist/og/ немає PNG-файлів для оптимізації.");

const paletteColors = [...new Set(
  Object.values(themeColors),
)];
if (!paletteColors.length) throw new Error("У themes.css немає кольорів для палітри.");

let optimizedCount = 0;
try {
  for (const file of pngFiles) {
    const pngName = file.split("/").pop();
    const isNichlystCard = /^nichlyst-(uk|en)(?:-v2)?\.png$/i.test(pngName);
    const isHomeCard = /^home(?:-v2)?\.png$/i.test(pngName);
    const imagePaletteColors = isNichlystCard
      ? [...new Set([
        themeColors.paper,
        themeColors.ink,
        themeColors.night,
        themeColors["text-night"],
        themeColors["accent-night"],
      ])]
      : isHomeCard
        ? [...new Set([
          themeColors.paper,
          themeColors.ink,
          themeColors["ink-dim"],
          themeColors["rule-soft"],
          themeColors.accent,
          themeColors["accent-night"],
        ])]
        : paletteColors;
    const paletteFile = join(tempDir, `palette-${file.split("/").pop()}`);
    const paletteArgs = imagePaletteColors.flatMap((color) => ["-size", "1x1", `xc:${color}`]);
    paletteArgs.push("+append", paletteFile);
    if (!run("magick", paletteArgs) && !run("convert", paletteArgs)) {
      throw new Error("Для побудови палітри потрібен системний ImageMagick (magick або convert).");
    }
    const tempFile = join(tempDir, file.split("/").pop());
    const args = [
      file,
      "-strip",
      "-dither",
      "None",
      "-remap",
      paletteFile,
      "-define",
      "png:compression-level=9",
      `PNG8:${tempFile}`,
    ];
    const quantized = run("magick", args) || run("convert", args);
    if (!quantized) {
      throw new Error("Для квантування OG потрібен системний ImageMagick (magick або convert).");
    }

    // Додаткове безвтратне стиснення, якщо optipng є в середовищі збірки.
    run("optipng", ["-o7", "-quiet", tempFile]);

    const size = statSync(tempFile).size;
    if (size > maxBytes) {
      throw new Error(`${file.split("/").pop()}: ${size} байтів після оптимізації (межа ${maxBytes}).`);
    }
    // Переконайся, що після квантування збережено той самий розмір полотна.
    const image = readFileSync(tempFile);
    if (
      image.toString("ascii", 1, 4) !== "PNG" ||
      image.readUInt32BE(16) !== 1200 ||
      image.readUInt32BE(20) !== 630
    ) {
      throw new Error(`${file.split("/").pop()}: очікувався PNG розміром 1200×630.`);
    }
    renameSync(tempFile, file);
    optimizedCount++;
    console.log(`optimize-og: ${file.split("/").pop()} — ${(size / 1024).toFixed(1)} КіБ, палітра ${imagePaletteColors.length} кольорів`);
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const distDir = resolve("dist");
const htmlFiles = filesUnder(distDir).filter((file) => file.endsWith(".html"));
if (!htmlFiles.length) throw new Error("У dist/ немає HTML для перевірки теми.");
let altPairCount = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  if (!/<meta\s+name=["']color-scheme["']\s+content=["']light["']\s*>/i.test(html)) {
    throw new Error(`${file.slice(distDir.length + 1)}: color-scheme має відповідати світлому meta режиму.`);
  }
  let metaCount = 0;
  const normalized = html.replace(
    /(<meta\s+name=["']theme-color["']\s+content=["'])[^"']*(["'][^>]*>)/gi,
    (_match, prefix, suffix) => {
      metaCount++;
      return `${prefix}${themeColors.paper}${suffix}`;
    },
  );
  if (metaCount !== 1) {
    throw new Error(`${file.slice(distDir.length + 1)}: очікувався один meta theme-color, знайдено ${metaCount}.`);
  }

  const ogAlt = normalized.match(/<meta\s+property=["']og:image:alt["']\s+content=["']([^"']+)["']/i)?.[1];
  const xAlt = normalized.match(/<meta\s+name=["']twitter:image:alt["']\s+content=["']([^"']+)["']/i)?.[1];
  if (ogAlt !== undefined || xAlt !== undefined) {
    if (!ogAlt || !xAlt || ogAlt !== xAlt) {
      throw new Error(`${file.slice(distDir.length + 1)}: OG/X alt-тексти порожні або не збігаються.`);
    }
    altPairCount++;
  } else if (!normalized.includes('<meta name="robots" content="noindex">')) {
    throw new Error(`${file.slice(distDir.length + 1)}: OG/X alt-тексти порожні або не збігаються.`);
  }
  if (normalized !== html) writeFileSync(file, normalized);
}
if (!/color-scheme\s*:\s*only light\s*;/i.test(readFileSync(resolve("src/styles/themes.css"), "utf8"))) {
  throw new Error("themes.css: очікується color-scheme: only light для світлого сайту.");
}

const faviconSvg = resolve("dist/favicon.svg");
const manifestPath = resolve("dist/site.webmanifest");
const faviconMarkup = readFileSync(faviconSvg, "utf8");
if (
  !faviconMarkup.includes(`.tile { fill: ${themeColors.paper}; }`) ||
  !faviconMarkup.includes(`.frame, .record { fill: none; stroke: ${themeColors.accent}; }`) ||
  !faviconMarkup.includes(`.tile { fill: ${themeColors.night}; }`) ||
  !faviconMarkup.includes(`.signal { fill: ${themeColors["accent-night"]}; }`)
) {
  throw new Error("favicon.svg не має світлої та темної схем із токенів themes.css.");
}
let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (error) {
  throw new Error(`site.webmanifest невалідний: ${error.message}`);
}
manifest.theme_color = themeColors.paper;
manifest.background_color = themeColors.paper;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const faviconIco = resolve("dist/favicon.ico");
const appleIcon = resolve("dist/apple-touch-icon.png");
const iconTempDir = mkdtempSync(join(distDir, ".icons-"));
try {
  const renderIcon = (size, path) =>
    runImageMagick([
      faviconSvg,
      "-background", "none",
      "-resize", `${size}x${size}`,
      "-dither", "None",
      "-colors", "3",
      "-define", "png:compression-level=9",
      `PNG8:${path}`,
    ]);
  const iconPngs = [16, 32, 48].map((size) => join(iconTempDir, `favicon-${size}.png`));
  if (!renderIcon(180, appleIcon) || ![16, 32, 48].every((size, index) => renderIcon(size, iconPngs[index]))) {
    throw new Error("Для генерації favicon потрібен системний ImageMagick.");
  }
  if (!runImageMagick([...iconPngs, faviconIco])) {
    throw new Error("Не вдалося зібрати favicon.ico з розмірів 16, 32 і 48 пікселів.");
  }
} finally {
  rmSync(iconTempDir, { recursive: true, force: true });
}

console.log(`optimize-og: ${optimizedCount} OG-зображень у межі ≤15 КіБ`);
console.log(`optimize-og: ${htmlFiles.length} theme-color, ${altPairCount} OG/X alt-пар перевірено; favicon і manifest синхронізовано`);
