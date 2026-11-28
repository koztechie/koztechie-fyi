---
title: "Practice"
lang: en
updated: 2026-11-28
summary: "Write-ups of my projects, technical decisions, and experiments. Real development experience and lessons learned."
og_description: "Case studies, technical decisions, and experiments. Real development experience and lessons learned."
intro: "This section is for write-ups of my projects, technical decisions, and experiments: what worked, what broke, and what I learned."
empty_label: "No case studies have been published yet."
draft: false
layout: list.njk
section: practice
---

Future case studies will follow a consistent seven-part structure:

{% for section in strings[lang].case_sections %}- {{ section }}
{% endfor %}
