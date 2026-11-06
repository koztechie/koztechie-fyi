---
title: "Practice"
lang: en
updated: 2026-11-06
summary: "Here I describe my projects, technical decisions, experiments and the results of my work. I write about results, problems and mistakes without embellishment."
intro: "Here I describe my projects, technical decisions, experiments and the results of my work. I write about results, problems and mistakes without embellishment."
draft: false
layout: list.njk
section: practice
---

Each description consists of seven parts:

{% for section in strings[lang].case_sections %}- {{ section }}
{% endfor %}
