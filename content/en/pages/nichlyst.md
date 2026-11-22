---
title: "NICHLYST"
lang: en
layout: project.njk
structured_data: nichlyst
updated: 2026-11-20
content_warning: [війна, травма]
summary: "NICHLYST is an indie narrative game for Android about memory, listening, and preserving human stories."
og_description: "An indie narrative game for Android by Eugene Kozlovsky. Listen, document, and protect stories from corruption."
og_title: "NICHLYST — koztechie"
og_image: "/og/nichlyst-en-v2.png"
og_image_alt: "koztechie — a dark NICHLYST field with the game title and a terracotta line."
translation_status: complete
draft: false
---

NICHLYST is a narrative game for Android about memory and preserving testimony. Each day, people bring their stories to the archive. You listen, record their accounts, and decide what to preserve.

<aside class="content-disclaimer" role="note">
  <p>All locations, countries, and characters are entirely fictional.</p>
</aside>

## What kind of game is it?

You keep an archive in a fictional underground node. Read testimonies and decide what to do with them: record, conceal, or refuse them. Choices change the archive and its resources.

- 40 days of narrative gameplay.
- Six archive resources: fuel, food, trust, endurance, memory, and watch.
- Ukrainian and English languages.

## Screenshots

<div class="nichlyst-gallery">
  <figure>
    <img src="/nichlyst/first-knock.webp" width="900" height="883"
      alt="Day 1 of the game: Khoma's testimony and three response choices for the archivist."
      loading="eager" fetchpriority="high" decoding="async"
      srcset="/nichlyst/first-knock-450.webp 450w, /nichlyst/first-knock-700.webp 700w, /nichlyst/first-knock.webp 900w"
      sizes="(max-width: 40rem) calc(100vw - 2rem), 40rem">
    <figcaption>Day 1. The first testimony and response choices. <a href="/nichlyst/first-knock.webp" download aria-label="Download screenshot: day 1, first testimony (WebP, 27 KB)">Download screenshot</a></figcaption>
  </figure>
  <figure>
    <img src="/nichlyst/choice-recorded.webp" width="900" height="883" alt="The result of a choice: testimony recorded in the ledger, with a continue button." loading="lazy" decoding="async">
    <figcaption>Consequence of a decision. <a href="/nichlyst/choice-recorded.webp" download aria-label="Download screenshot: consequence of a decision (WebP, 36 KB)">Download screenshot</a></figcaption>
  </figure>
  <figure>
    <img src="/nichlyst/title-screen.webp" width="900" height="883" alt="NICHLYST title screen with the game title and an Open Archive button." loading="lazy" decoding="async">
    <figcaption>Title screen. <a href="/nichlyst/title-screen.webp" download aria-label="Download screenshot: title screen (WebP, 6 KB)">Download screenshot</a></figcaption>
  </figure>
</div>

## Status and access

<p class="nichlyst-status">In development. It will be released when it’s ready.</p>

The prologue will be free. A one-time purchase unlocks the full game; there is no subscription. The price will be shown in the store before purchase.

The minimum Android version configured for the app is Android 7.0 (API 24).

The game is rated 16+. Narrative push notifications are delivered through OneSignal and can be disabled in device settings. Sentry sends anonymous technical crash reports.

Game privacy policy: read it in [Ukrainian](/nichlyst/privacy/) or [English](/en/nichlyst/privacy/).

## Press kit

<figure class="nichlyst-logo">
  <img src="/nichlyst/logo.webp" width="512" height="512" alt="NICHLYST logo: a paper crane above the game title." loading="lazy" decoding="async">
  <figcaption><a href="/nichlyst/logo.webp" download>Download logo</a></figcaption>
</figure>

### Logo usage

Use the original 512 × 512 px square file without cropping, stretching, recoloring, filters, or text overlays. The background is part of the image. Keep clear space around the logo of at least 5% of its width; do not place it on a visually busy background. Do not separate the crane from the wordmark or change their relative placement.

### Fact sheet

<dl class="nichlyst-facts">
  <div><dt>Title</dt><dd>NICHLYST</dd></div>
  <div><dt>Genre</dt><dd>Narrative game</dd></div>
  <div><dt>Developer</dt><dd>Eugene Kozlovsky / koztechie</dd></div>
  <div><dt>Platform</dt><dd>Android</dd></div>
  <div><dt>Localization</dt><dd>Ukrainian (uk), English (en)</dd></div>
  <div><dt>Purchase</dt><dd>One-time full-game unlock</dd></div>
  <div><dt>Age rating</dt><dd>16+</dd></div>
  <div><dt>Notifications</dt><dd>Narrative push via OneSignal; can be disabled in device settings</dd></div>
  <div><dt>Crash reports</dt><dd>Sentry; anonymous technical data</dd></div>
  <div><dt>Website</dt><dd><a href="https://koztechie.fyi/nichlyst/">koztechie.fyi/nichlyst/</a></dd></div>
  <div><dt>Press contact</dt><dd><a href="mailto:{{ (strings[lang] | default(strings.uk)).footer.email | safe }}">{{ (strings[lang] | default(strings.uk)).footer.email | safe }}</a></dd></div>
  <div><dt>Status</dt><dd>In development; no release date announced</dd></div>
</dl>
