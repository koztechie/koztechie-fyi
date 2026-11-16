---
title: "Colophon"
lang: en
layout: page.njk
updated: 2026-11-16
summary: "How this site is built: typography, tech stack, hardware, GitHub, and licensing."
og_description: "A look behind the scenes: typography, tools, hardware, and licensing."
og_title: "Colophon — koztechie"
translation_status: complete
draft: false
---

## Font stacks

- **Text (`--font-text`)** — `system-ui`, `-apple-system`, `Segoe UI`, sans-serif.
- **Interface (`--font-ui`)** — `system-ui`, `-apple-system`, `Segoe UI`, sans-serif.
- **Code and technical labels (`--font-mono`)** — `ui-monospace`, `Cascadia Code`, `Consolas`, monospace.

All fonts are system fonts; no font files are downloaded.

## Tools

- **Eleventy 3.1.7** — static site generator.
- **Node.js 22** — build environment runtime.
- **Vanilla CSS** — hand-written styles without frameworks or preprocessors.
- **Git** — version control.

## Palette and contrast

The palette rests on an almost-white `--paper` and near-black `--ink`. Its
single daytime accent, `--accent`, comes from the dark raspberry background in
the portrait. `--link` and `--focus` are semantic aliases of that accent. In
the local night world, text and background roles reverse and the accent has a
lighter counterpart.

`src/styles/themes.css` is the source of the tokens. The build synchronizes the
theme meta tag, manifest, and favicon, and generates the table below.
`npm run palette` checks text contrast at AAA (7:1), UI text at AA (4.5:1), and
non-text boundaries and focus at a minimum of 3:1. OG/X alt text lives in
language dictionaries and front matter; the build checks that both values
match:

<!-- PALETTE-RATIOS:START -->

| Foreground | Background | Contrast |
|---|---|---|
| `--ink` | `--paper` | 17.95:1 |
| `--ink-dim` | `--paper` | 7.26:1 |
| `--accent` | `--paper` | 9.40:1 |
| `--rule-strong` | `--paper` | 3.31:1 |
| `--text-night` | `--night` | 17.12:1 |
| `--text-dim` | `--night` | 7.60:1 |
| `--accent-night` | `--night` | 8.29:1 |
| `--rule-strong (night)` | `--night` | 3.44:1 |
| `--paper` | `--accent` | 9.40:1 |

<!-- PALETTE-RATIOS:END -->

## Why these colors

Near-white and near-black create a calm, legible ground for writing and records.
The raspberry accent is sampled from the portrait: it marks links, focus, and
important signals rather than filling large areas. In night sections, the same
hue direction is lightened to preserve contrast. The site does not switch its
entire palette with system settings; night mode is scoped to NICHLYST and the
Cemetery. Game images and logos remain unchanged.

## RSS

The two language feeds include every published entry from the Blog, Practice, Poetry, and Cemetery sections—full text, with drafts and translation stubs excluded.

## Page-weight budget

The limit is 50 KiB per page. `scripts/size-budget.mjs` compresses each file separately with Brotli (quality 11), then adds that page’s HTML size to the combined size of CSS and JS files in `dist/`. Images and other media are excluded. This is a reproducible estimate, not the exact byte count of a specific network request.

## Hardware

- **AMD A4-4020**, 8 GB RAM.
- **Ubuntu 26.04.1 LTS**.

Everything on this site is written, tested, and built on this machine.

## GitHub

The website code is not currently published in a public repository. [koztechie on GitHub](https://github.com/koztechie).

The code is licensed under the ISC License (`LICENSE`). Texts, poetry, photographs, and other materials are protected by copyright; all rights reserved (`COPYRIGHT`).

Quality control: Ukrop makes sure I don't write too much.
