---
title: "Contact"
lang: en
layout: page.njk
updated: 2026-11-18
summary: "How to get in touch with me. The best and only way is by email."
og_description: "Contact page. Drop me an email if you have a question or a proposal."
translation_status: complete
draft: false
---

If you have a question, a proposal, or just want to discuss something, feel free to drop me an email.

<div class="contact-method">
  <a href="mailto:{{ (strings[lang] | default(strings.uk)).footer.email | safe }}">Send an email</a>
  <span class="contact-address">{{ (strings[lang] | default(strings.uk)).footer.email | safe }}</span>
</div>

<section id="security">

## Security reports

Report vulnerabilities to
<code class="contact-address">{{ (strings[lang] | default(strings.uk)).footer.email | safe }}</code>. Include the affected URL, a description of the issue,
and reproducible steps. Do not send secrets, personal data, or work
credentials. No PGP key is published.

</section>

## A few things to note

- The mailbox is working; external receipt, replies, and delivery have been
  confirmed. The expected response time is up to 7 days.
- Email is the only way to reach me. I don't use messengers for website-related communication, and I don't take work calls.
- Your email address stays strictly between us. I don't build contact lists, and I never send out newsletters.
