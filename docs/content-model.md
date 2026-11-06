# CONTENT-MODEL.MD: ЄДИНА КОНТЕНТ-МОДЕЛЬ (ВУЗОЛ-0)

**Статус: ЗАТВЕРДЖЕНО** (аудит 2). Канон. Розділи 22–26 `DECISIONS.md` замінені посиланням на цей документ.

**Перевірка:** `node scripts/validate-content.mjs content/`

---

## 1. Шість контент-типів

| # | Тип | Розділ | Layout | Приклад |
|---|-----|--------|--------|---------|
| 1 | Запис | `/blog/` | `post.njk` | Спостереження, думка, допис з архіву |
| 2 | Кейс | `/practice/` | `post.njk` | Кейс з 7 обов'язкових секцій |
| 3 | Кладовище | `/cemetery/` | `post.njk` | Епітафія закритого проєкту |
| 4 | Вірш | `/poetry/` | `poetry.njk` | Вільний вірш |
| 5 | Сторінка | `/manifest/`, `/now/`, `/colophon/`, `/contact/`, `/privacy/`, `/nichlyst/` | `page.njk`, `nichlyst.njk` | Статична сторінка |
| 6 | Розділ | `/blog/`, `/poetry/`, `/cemetery/` (індекси) | `page.njk` | Вступ до розділу |

**Правило:** `/practice/` — лише Кейс. Девлоги та есеї → `/blog/` (`inventory.md`).

---

## 2. Єдина схема полів

**Легенда:** R — обов'язкове, O — опційне, авто — обчислюється, — — немає.

| Поле | Запис | Кейс | Кладовище | Вірш | Сторінка | Розділ |
|------|-------|------|---------|------|----------|--------|
| `title` | R | R | R | R | R | R |
| `title_en` | O | O | O | O | O | O |
| `lang` | R | R | R | R | R | R |
| `slug` | R | R | R | R | — | — |
| `entry` | R | R | R | R | — | — |
| `date` | R | R | R | R | — | — |
| `updated` | O | O | O | O | R | O |
| `summary` | R | R | авто | авто | R | O |
| `content_warning` | O | O | O | O | — | — |
| `translation_status` | R | R | R | R | R | — |
| `tags` | O | O | — | — | — | — |
| `consent` | — | R | — | — | — | — |
| `first_published` | O | O | O | O | — | — |
| `written` | — | — | — | O | — | — |
| `period` | — | — | R | — | — | — |
| `cause` | — | — | R | — | — | — |
| `epitaph` | — | — | R | — | — | — |
| `season` | — | — | — | — | O (/now/) | — |
| `working_on` | — | — | — | — | O (/now/) | — |
| `reading` | — | — | — | — | O (/now/) | — |
| `energy` | — | — | — | — | O (/now/) | — |
| `intro` | — | — | — | — | — | O |
| `draft` | O | O | O | O | O | O |

---

## 3. Опис полів

### 3.1. Загальні

| Поле | Тип | Опис |
|------|-----|------|
| `title` | string | Назва українською. ≤ 60 символів для `<title>` (обрізається, `<h1>` повний). |
| `title_en` | string | Назва англійською. Опційне. Без нього шаблон використовує `title`. |
| `lang` | enum | `uk` або `en`. Мова файлу. `<html lang>`, RSS `lang`. |
| `slug` | string | Без цифр дати (§20 DECISIONS). Той самий для uk та en файлів. |
| `entry` | integer | Незмінний номер з моменту першої публікації. Глобальна послідовність для blog/practice/poetry/cemetery. Не змінюється при перенесенні. |
| `date` | date | ISO 8601. Дата першої публікації. Не в URL. Незмінна після публікації. |
| `updated` | date | ISO 8601. Дата останнього оновлення. Sitemap `lastmod` = `updated` або `date`. |
| `summary` | string | ≤ 160 символів. Meta, OG, RSS. Для цвинтаря = `epitaph` автоматично. Для вірша = перші 2 рядки автоматично. |
| `content_warning` | enum | `війна`, `здоровʼя`, `травма`, `смерть`, `залежність` (§32.1 DECISIONS). Шаблон будує речення обома мовами. |
| `translation_status` | enum | `complete`, `partial`, `not_planned`. Валідуй проти наявності en-файлу: `complete` без файлу — помилка. |
| `tags` | array | ≤ 5. Для групування в архіві. Не для навігації. |
| `first_published` | string | Де/коли вперше опубліковано. Шаблон генерує «З архіву: …». |
| `draft` | boolean | За замовчуванням `true` у шаблоні. Виробнича збірка виключає `draft: true`. Знімай після чеклиста. |

### 3.2. Кейс

| Поле | Тип | Опис |
|------|-----|------|
| `consent` | string | Письмова згода роботодавця/клієнта. Без згоди — «клієнт з галузі X» (§24.5 DECISIONS). |

**7 обов'язкових секцій у тілі:** Роль, Період, Задача, Рішення, Що зламалося, Що викинув би, Що це мені дало.

**Заголовки секцій:** через словники `strings/uk.json`, `strings/en.json`. Валідатор перевіряє порядок і наявність.

### 3.3. Кладовище

| Поле | Тип | Опис |
|------|-----|------|
| `period` | string | Коли проєкт існував. Конкретні роки/місяці. |
| `cause` | string | Чому закрито. Конкретна причина. |
| `epitaph` | string | Один рядок. Підсумок. `summary` = `epitaph` автоматично. |

**Обмеження:** `epitaph` — рівно одне речення. Крапка в кінці.

### 3.4. Вірш

| Поле | Тип | Опис |
|------|-----|------|
| `written` | date | Опційне. Дата написання. Не використовується для сортування. |
| `first_published` | string | Де вперше з'явився публічно. |

**Розмітка:** Строфа = абзац. Рядок = перенос (`breaks: true` у markdown-it). Відступи — `white-space: pre-wrap` у `poetry.njk`.

**Переклад:** Окремий файл `content/en/poetry/slug.md`. Не роздільник `---` у тілі.

### 3.5. Сторінка `/now/`

| Поле | Тип | Опис |
|------|-----|------|
| `season` | string | Дата актуальності стану: місяць і рік (мітка — «Оновлено»). |
| `working_on` | array | Над чим працюю. |
| `reading` | array | Що читаю. |
| `energy` | integer | Рівень енергії 0–10. |

**Оновлення:** Раз на місяць, вручну (§27 DECISIONS).

---

## 4. Модель англійських версій

**Правило:** Один файл на мову. Однаковий `slug`. `lang` обов'язковий.

```
content/uk/blog/slug.md    → lang: "uk" → /blog/slug/
content/en/blog/slug.md    → lang: "en" → /en/blog/slug/
```

**Валідація:** `translation_status: complete` без en-файлу — помилка.

**Англомовні оригінали:** `lang: "en"` в українській теці. URL `/en/blog/slug/`. `translation_status: complete`.

---

## 5. Шаблони

### 5.1. Запис

```yaml
---
title: "[Назва]"
title_en: "[English title]"
lang: "uk"
slug: "[slug]"
entry: [номер]
date: [YYYY-MM-DD]
summary: "[≤ 160 символів]"
translation_status: "complete"  # complete | partial | not_planned
tags: ["тег1", "тег2"]
content_warning: ""  # війна | здоровʼя | травма | смерть | залежність
first_published: ""  # опційно
draft: true
---

[Текст запису.]
```

### 5.2. Кейс

```yaml
---
title: "[Назва]"
title_en: "[English title]"
lang: "uk"
slug: "[slug]"
entry: [номер]
date: [YYYY-MM-DD]
summary: "[≤ 160 символів]"
translation_status: "not_planned"
consent: "[згода або «клієнт з галузі X»]"
draft: true
---

## Роль

[Хто я був. Конкретна функція.]

## Період

[Коли. Конкретні місяці/роки.]

## Задача

[Що потрібно було зробити. Обмеження.]

## Рішення

[Що я зробив. Компроміси.]

## Що зламалося

[Помилки. Невдачі. Конкретні приклади.]

## Що викинув би

[Зайвий код. Непотрібні залежності.]

## Що це мені дало

- [Пункт 1. Одне речення. Конкретика.]
- [Пункт 2. Одне речення. Конкретика.]
- [Пункт 3. Одне речення. Конкретика. Не обов'язково.]
```

### 5.3. Кладовище

```yaml
---
title: "[Назва проєкту]"
title_en: "[Project name]"
lang: "uk"
slug: "[slug]"
entry: [номер]
date: [YYYY-MM-DD]
period: "[конкретні роки]"
cause: "[конкретна причина]"
epitaph: "[один рядок. Підсумок.]"
translation_status: "not_planned"
draft: true
---

[Епітафія. Один рядок.]
```

**Приклад — НЕ ФАКТ:**

```yaml
---
title: "[Назва]"
title_en: "[Name]"
lang: "uk"
slug: "[slug]"
entry: 1
date: 2026-10-17
period: "[роки]"
cause: "[причина]"
epitaph: "[один рядок]"
translation_status: "not_planned"
draft: true
---
```

### 5.4. Вірш

```yaml
---
title: "[Назва]"
title_en: "[Poem title]"
lang: "uk"
slug: "[slug]"
entry: [номер]
date: [YYYY-MM-DD]  # перша публічна поява
written: "[YYYY-MM-DD]"  # опційно: дата написання
first_published: "[де вперше опубліковано]"
translation_status: "complete"  # complete | not_planned
draft: true
---

[Рядок вірша 1]
[Рядок вірша 2]

[Рядок вірша 3]
[Рядок вірша 4]
```

**Переклад:** Окремий файл `content/en/poetry/slug.md`.

### 5.5. Сторінка

```yaml
---
title: "[Назва]"
title_en: "[English title]"
lang: "uk"
layout: "page.njk"  # page.njk | nichlyst.njk
updated: [YYYY-MM-DD]
summary: "[≤ 160 символів]"
translation_status: "complete"
draft: true
---

[Текст сторінки.]
```

### 5.6. Розділ (індекс)

```yaml
---
title: "[Назва розділу]"
lang: "uk"
updated: [YYYY-MM-DD]
summary: "[опційно]"
intro: "[опційно: вступ до розділу]"
draft: true
---

[Список записів розділу.]
```

---

## 6. Правила slug

- Без цифр дати (§20 DECISIONS).
- Без числових префіксів.
- Той самий для uk та en файлів.
- Унікальний глобально (не лише в межах розділу).

---

## 7. Правила публікації

1. Заповни шаблон з §5.
2. Пропусти через `scripts/validate-content.mjs content/`.
3. Пропусти через `scripts/voice-lint.mjs [файл]`.
4. Пройди `red-lines.md` (скан §2).
5. Пройди чеклист (`docs/editorial-checklist.md`).
6. Зніми `draft: true`.
7. Коміт + push.

---

## 8. Обмеження

- `title` ≤ 60 символів для `<title>`. `<h1>` повний.
- `summary` ≤ 160 символів.
- `tags` ≤ 5.
- `date` незмінна після публікації.
- `entry` незмінний завжди.
- `slug` без цифр дати.
- `translation_status: complete` без en-файлу — помилка.
- `epitaph` — рівно одне речення.
- `consent` обов'язковий для кейсів.
- `content_warning` — enum, не вільний рядок.