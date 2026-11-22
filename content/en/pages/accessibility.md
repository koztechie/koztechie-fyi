---
title: "Accessibility"
lang: en
layout: page.njk
updated: 2026-11-21
summary: "The koztechie.fyi accessibility statement and a way to report a barrier."
og_description: "The koztechie.fyi accessibility statement."
translation_status: complete
draft: false
---

## Conformance status

Automated checks cover **WCAG 2.2 AA** criteria; passing them is not
certification or proof of full conformance.
Body text is checked for **AAA (≥7:1)**, interface text for **AA (≥4.5:1)**,
and non-text boundaries for **3:1**, where applicable.
The implementation follows EN 301 549 good practice and avoids dark patterns.

Automated checks have passed (WCAG 2.2 AA). Manual assistive-technology
verification is ongoing; its protocol is recorded in
`docs/a11y-verification.md`.

## Known limitations

Manual checks with NVDA, VoiceOver, TalkBack, High Contrast, 400% Zoom, and
reader mode are not complete. The statement “no known limitations” is therefore
not made yet. Accessibility is checked on every build; results can vary with
the browser, operating system, or assistive technology.

## Feedback

The mailbox is working. The expected response time for accessibility reports
is up to 7 days.

Report a barrier with the page and reproducible steps:

<a href="mailto:{{ (strings[lang] | default(strings.uk)).footer.email | safe }}">Report an accessibility issue</a>

**Statement date:** 21 November 2026
