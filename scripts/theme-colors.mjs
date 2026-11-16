import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function readThemeColors() {
  const css = readFileSync(resolve("src/styles/themes.css"), "utf8");
  const root = css.match(/:root\s*\{([^}]*)\}/)?.[1];
  if (!root || !css.includes(':where([data-world="night"])')) {
    throw new Error("themes.css: потрібні блоки :root і [data-world=\"night\"].");
  }
  const colors = Object.fromEntries(
    [...root.matchAll(/--(paper|ink|ink-dim|rule-soft|rule-strong|rule-soft-night|rule-strong-night|accent|night|text-night|text-dim|accent-night)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)]
      .map(([, name, value]) => [name, value.toLowerCase()]),
  );
  const required = [
    "paper", "ink", "ink-dim", "rule-soft", "rule-strong",
    "rule-soft-night", "rule-strong-night", "accent", "night",
    "text-night", "text-dim", "accent-night",
  ];
  const missing = required.filter((name) => !colors[name]);
  if (missing.length) {
    throw new Error(`themes.css: відсутні базові токени ${missing.map((name) => `--${name}`).join(", ")}`);
  }
  return colors;
}

function luminance(hex) {
  const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const [r, g, b] = rgb.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground, background) {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return ((light + 0.05) / (dark + 0.05)).toFixed(2);
}

export function paletteRatioRows(colors) {
  return [
    ["--ink", "--paper", contrastRatio(colors.ink, colors.paper)],
    ["--ink-dim", "--paper", contrastRatio(colors["ink-dim"], colors.paper)],
    ["--accent", "--paper", contrastRatio(colors.accent, colors.paper)],
    ["--rule-strong", "--paper", contrastRatio(colors["rule-strong"], colors.paper)],
    ["--text-night", "--night", contrastRatio(colors["text-night"], colors.night)],
    ["--text-dim", "--night", contrastRatio(colors["text-dim"], colors.night)],
    ["--accent-night", "--night", contrastRatio(colors["accent-night"], colors.night)],
    ["--rule-strong (night)", "--night", contrastRatio(colors["rule-strong-night"], colors.night)],
    ["--paper", "--accent", contrastRatio(colors.paper, colors.accent)],
  ];
}

export function renderPaletteRatioTable(colors, language = "uk") {
  const headers = language === "en"
    ? ["Foreground", "Background", "Contrast"]
    : ["Передній план", "Тло", "Контраст"];
  return [
    `| ${headers.join(" | ")} |`,
    "|---|---|---|",
    ...paletteRatioRows(colors).map(([foreground, background, ratio]) =>
      `| \`${foreground}\` | \`${background}\` | ${ratio}:1 |`
    ),
  ].join("\n");
}
