---
title: "Practice"
lang: en
updated: 2026-11-07
summary: "The Practice section: write-ups of my projects, technical decisions and experiments, including mistakes and takeaways."
og_description: "The Practice section: my projects, technical decisions, experiments, and real development experience."
intro: "Here I collect write-ups of my projects, technical decisions and experiments. I tell it like it is: what worked, what broke, and what I took away from it."
draft: false
layout: list.njk
section: practice
---

For convenience, every write-up follows a stable seven-part structure:

{% for section in strings[lang].case_sections %}- {{ section }}
{% endfor %}
