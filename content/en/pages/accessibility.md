---
title: "Accessibility"
lang: en
layout: page.njk
updated: 2026-11-18
summary: "The koztechie.fyi accessibility statement and a way to report a barrier."
og_description: "The koztechie.fyi accessibility statement."
translation_status: complete
draft: false
---

## Conformance status

This site is self-assessed as conforming to **WCAG 2.2 Level AA**.
Text and primary interface pairs meet **AAA** contrast where applicable.
The implementation follows EN 301 549 good practice and avoids dark patterns.

Testing covers HTML, keyboard navigation, focus, reflow, system modes, zoom,
text spacing, forced colors, mobile Lighthouse, and axe checks. The manual
assistive-technology test protocol is recorded in
`docs/a11y-verification.md`.

## Known limitations

No known implementation limitations remain after this plan. Accessibility is
checked on every build; results can vary with the browser, operating system,
or assistive technology.

## Feedback

The mailbox is working. The expected response time for accessibility reports
is up to 7 days.

Report a barrier with the page and reproducible steps:

<a href="mailto:{{ (strings[lang] | default(strings.uk)).footer.email | safe }}">Report an accessibility issue</a>

**Statement date:** 18 November 2026  
**Verification commit:** `4a739c6`
