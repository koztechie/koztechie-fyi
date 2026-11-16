# ВУЗОЛ-0

Архівний вузол `koztechie.fyi`. Місце фіксації свідчень, есеїв і мертвого
коду, що працює за принципами антикрихкості. Не портфоліо.

Слоган: «Текст без прикрас.»

## Що це

| | |
|---|---|
| Мова | українська (корінь), англійська (`/en/`) |
| Стек | Eleventy v3.1.7, чистий CSS, 0 байт JavaScript |
| Хостинг | Netlify (статика) |
| Аналітика | відсутня. GSC — єдиний свідомий виняток |
| Контакти | email, без форм, без коментарів |

Сайт має виживати на машині 2012 року (AMD A4-4020, 8 ГБ ОЗП) та на
повільному каналі. Бюджет сторінки: ≤ 50 КБ (HTML + CSS + JS).

## Структура

```
├── content/
│   ├── uk/          український контент
│   ├── en/          англійський контент
│   └── shared/      спільні файли
├── src/
│   ├── styles/      5 CSS-файлів
│   └── templates/   шаблони Eleventy
├── static/          шрифти, зображення, favicon
├── scripts/         автономні скрипти (без залежностей)
├── docs/            технічна документація
├── eleventy.config.js
└── netlify.toml
```

## Як зібрати

**Вимоги:** Node.js 22 (див. `.nvmrc`), npm.

```bash
npm ci --ignore-scripts    # встановлення (одна залежність)
npm run dev                # dev-сервер: http://localhost:8080
npm run build              # збірка у dist/
npm run check              # автономний чекліст
```

**Перевірка до коміту:**

```bash
git config core.hooksPath scripts/hooks   # pre-commit: npm run check
```

**Збірка на Netlify:** `npm ci --ignore-scripts && npm run build && npm run check`.

Деталі: `docs/ARCHITECTURE.md` (механіка Eleventy),
`docs/TECH_STANDARDS.md` (бюджети й перевірки).

## Як написати пост

### 1. Створи файл

`content/uk/blog/[slug].md` або `content/uk/poetry/[slug].md`.

**Slug:** без цифр дати, латиницею, через дефіс. Той самий для uk та en.

### 2. Заповни frontmatter

```yaml
---
title: "[Назва українською, ≤ 60 символів для <title>]"
lang: "uk"
slug: "[slug]"
entry: [номер]              # наступний вільний у глобальній послідовності
date: [YYYY-MM-DD]          # не змінюється після публікації
summary: "[≤ 160 символів]"
translation_status: "not_planned"   # complete | partial | not_planned
draft: true
---
```

**`entry`** — незмінний номер з моменту першої публікації. Глобальна
послідовність для `blog`, `practice`, `poetry`, `cemetery`. Наступний
номер дивись у `git log` або в останньому файлі колекції. Не змінюється
при перенесенні.

**`draft: true`** знімай після проходження чеклиста. Виробнича збірка
виключає `draft: true`.

Повна схема полів: `docs/content-model.md`.

### 3. Дотримуйся голосу

| ✅ Так | ❌ Ні |
|--------|-------|
| Вигорання | Як пережити вигорання! |
| Svitlogics | Моя історія Svitlogics |
| «Зробив» | «Створив унікальний продукт» |

Заборонені слова: «пасіонарний», «експерт», «гуру», «унікальний досвід»,
«історія успіху», «надихаючий», «в ресурсі», «лідер думок».

Голос: сухий, літературний, самоіронічний. Жодного знака оклику.
Іменники, не оклики. Без «списків із 10 способів».

Важкі теми (війна, здоровʼя, травма, смерть, залежність) — з
`content_warning` у frontmatter.

### 4. Прогони перевірки

```bash
node scripts/validate-content.mjs    # поля, дати, slug, consent, entry
node scripts/voice-lint.mjs          # заборонені слова, UTM
npm run check                        # бюджети, CSS, h1, alt, DOM
npm run size                         # вага dist/: сторінка, CSS, шрифти, favicon
  npm run palette                      # контраст палітр: AAA ≥ 7:1
```

### 5. Публікуєш

1. Зніми `draft: true`.
2. `npm run build && npm run check`.
3. Коміт, push.
4. Англійська версія — окремим файлом у `content/en/` з тим самим `slug`.
   Без файлу — `translation_status: "not_planned"`.

## Ліцензія

- **Код:** ISC (`LICENSE`).
- **Тексти, поезія, фото:** © всі права застережено (`COPYRIGHT`).

## Документація

| Документ | Що містить |
|----------|-----------|
| `docs/ARCHITECTURE.md` | Структура й механіка Eleventy |
| `docs/DECISIONS.md` | Технічні та редакційні рішення |
| `docs/TECH_STANDARDS.md` | Бюджети, перевірки й стандарти |
| `docs/content-model.md` | Типи контенту й поля |
| `docs/design-system.md` | Візуальна система й токени |
| `docs/deploy.md` | Збірка та розгортання |
| `docs/sitemap.md` | Призначення маршрутів |
| `docs/runbook.md`, `docs/recovery.md` | Діагностика й відновлення |
