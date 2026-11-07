---
title: "Practice"
lang: en
updated: 2026-11-07
summary: "Write-ups of my projects, technical decisions, and experiments. Real development experience and lessons learned."
og_description: "Case studies, technical decisions, and experiments. Real development experience and lessons learned."
intro: "This is where I document my projects, technical decisions, and experiments. I just share how it actually went: what worked, what broke, and what I learned."
draft: false
layout: list.njk
section: practice
---

For consistency, every write-up follows the same structure:

{% for section in strings[lang].case_sections %}- {{ section }}
{% endfor %}
