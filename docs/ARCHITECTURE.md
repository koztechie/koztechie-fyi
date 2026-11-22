# ARCHITECTURE.md: СТРУКТУРА ТА МЕХАНІКА ELEVENTY (ВУЗОЛ-0)

**Статус: ЗАТВЕРДЖЕНО** (аудит 2).

**Джерело істини:** `DECISIONS.md`. При розбіжності спочатку правиш `DECISIONS.md`, потім цей документ.

**Контент-моделі:** `content-model.md` (канон). Цей документ описує лише механіку Eleventy.

**Правило винятків:** Зупинись, запиши питання в `docs/QUESTIONS.md`, чекай команди.

---

## 1. ДЕРЕВО

```text
/
├── content/
│   ├── uk/
│   │   ├── blog/
│   │   │   ├── blog.11tydata.json      # directory data
│   │   │   └── [slug].md
│   │   ├── practice/
│   │   │   ├── practice.11tydata.json
│   │   │   └── [slug].md
│   │   ├── cemetery/
│   │   │   ├── cemetery.11tydata.js
│   │   │   └── [slug].md
│   │   ├── poetry/
│   │   │   ├── poetry.11tydata.json
│   │   │   └── [slug].md
│   │   ├── pages/
│   │   │   ├── pages.11tydata.json
│   │   │   ├── manifest.md
│   │   │   ├── now.md
│   │   │   ├── colophon.md
│   │   │   ├── contact.md
│   │   │   ├── privacy.md
│   │   │   └── nichlyst.md
│   │   └── index.md                    # Головна
│   ├── en/
│   │   ├── blog/                       # Дзеркало uk/
│   │   ├── practice/
│   │   ├── cemetery/
│   │   ├── poetry/
│   │   ├── pages/
│   │   └── index.md
│   └── shared/
│       └── topics.json                 # Контрольований словник тегів (≤ 6)
├── docs/
├── scripts/
│   ├── check.mjs
│   ├── bundle-styles.mjs
│   ├── palette-check.mjs
│   ├── postbuild.mjs
│   ├── size-budget.mjs
│   ├── validate-content.mjs
│   ├── plan-lint.mjs
│   ├── voice-lint.mjs
│   ├── export-devto.mjs
│   └── hooks/
│       └── pre-commit
├── src/
│   ├── _data/
│   │   ├── strings/
│   │   │   ├── uk.json
│   │   │   └── en.json
│   │   └── site.json
│   ├── styles/
│   │   ├── core.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   ├── themes.css
│   │   ├── print.css
│   ├── templates/
│   │   ├── base.njk
│   │   ├── post.njk
│   │   ├── case.njk                    # Записи Практики
│   │   ├── cemetery-entry.njk          # Закриті проєкти
│   │   ├── project.njk                 # NICHLYST
│   │   ├── list.njk
│   │   ├── page.njk
│   │   ├── poetry.njk
│   │   ├── stub.njk                     # Заглушка перекладу
│   │   ├── 404.njk
│   │   ├── feed.njk
│   │   ├── sitemap.njk
│   │   ├── header.njk
│   │   └── footer.njk
├── static/
│   ├── img/
│   └── root/
│       ├── favicon.svg
│       ├── favicon.ico
│       ├── apple-touch-icon.png
│       ├── site.webmanifest
│       ├── robots.txt
│       └── _headers                    # Netlify Headers
├── dist/                               # Вихід (git-ігнор)
├── .eleventyignore
├── .gitignore
├── .nvmrc
├── eleventy.config.js
├── netlify.toml
├── package.json
├── package-lock.json
├── AGENTS.md
├── README.md
└── LICENSE
```

**Заборонено:** `src/js/` (JS: 0 байт), `.env`, `content/*/tags/`, `content/*/archive/`.

---

## 2. КОНФІГУРАЦІЯ ELEVENTY

**Формат:** ESM (`"type": "module"` у `package.json`).

**`eleventy.config.js`:**

```js
export default function (eleventyConfig) {
  // Passthrough
  eleventyConfig.addPassthroughCopy({"static/root": "/"});
  eleventyConfig.addPassthroughCopy({"static/img": "img"});
  eleventyConfig.addPassthroughCopy({"src/styles": "styles"});

  // Колекції
  eleventyConfig.addCollection("blog", (api) =>
    api.getFilteredByGlob("content/*/blog/*.md").sort((a, b) => b.data.date - a.data.date)
  );
  eleventyConfig.addCollection("practice", (api) =>
    api.getFilteredByGlob("content/*/practice/*.md").sort((a, b) => b.data.date - a.data.date)
  );
  eleventyConfig.addCollection("cemetery", (api) =>
    api.getFilteredByGlob("content/*/cemetery/*.md").sort((a, b) => b.data.date - a.data.date)
  );
  eleventyConfig.addCollection("poetry", (api) =>
    api.getFilteredByGlob("content/*/poetry/*.md").sort((a, b) => b.data.entry - a.data.entry)
  );

  // Фільтри
  eleventyConfig.addFilter("ukDate", (date) => {
    return new Intl.DateTimeFormat("uk-UA", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  });

  eleventyConfig.addFilter("readingTime", (content) => {
    const words = content.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 180));
  });

  // Конфіг
  return {
    dir: {
      input: ".",
      includes: "src/templates",
      data: "src/_data",
      output: "dist",
    },
    templateFormats: ["md", "njk"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
```

Шрифти не копіюються: інтерфейс використовує системні шрифтові стеки.

**`.eleventyignore`:**

```
docs/
scripts/
dist/
node_modules/
README.md
AGENTS.md
LICENSE
```

**Збірка CSS:** `scripts/bundle-styles.mjs` об'єднує чотири екранні таблиці й додає SHA-256 fingerprint до назв `dist/styles/site.*.css` та `print.*.css`; останній підключається лише для медіа друку. Залежностей для збірки немає.

---

## 3. DIRECTORY DATA

**Приклад `content/uk/blog/blog.11tydata.json`:**

```json
{
  "layout": "post.njk",
  "lang": "uk",
  "eleventyComputed": {
    "permalink": "/blog/{{ page.fileSlug }}/"
  }
}
```

**Приклад `content/en/blog/blog.11tydata.json`:**

```json
{
  "layout": "post.njk",
  "lang": "en",
  "eleventyComputed": {
    "permalink": "/en/blog/{{ page.fileSlug }}/"
  }
}
```

**Аналогічно для:** `practice`, `cemetery`, `poetry`, `pages`.

**Макети записів:** блог використовує `post.njk`; записи Практики —
`case.njk`; записи Кладовища — `cemetery-entry.njk`; поезія — `poetry.njk`.
Індекси розділів лишаються на `list.njk`. NICHLYST використовує
`project.njk`, інші статичні сторінки — `page.njk`, `/now/` — `now.njk`.

**Головна:** `content/uk/index.md` → `/`; `content/en/index.md` → `/en/`.

---

## 4. ПЕРЕКЛАДИ

**Правило:** Один файл на мову. Одинаковий slug.

**Відсутність перекладу:** Завжди заглушка 200 з `noindex`. Перемикач ніколи не веде в корінь.

**Шаблон `stub.njk`:**

```html
<article class="translation-pending">
  <h1>Not translated</h1>
  <p>Read the original in Ukrainian →</p>
  <p><a href="/{{ slug }}/">Читати українською</a></p>
</article>
```

**`noindex` на заглушки.** Не включай у sitemap і hreflang.

**Англомовні оригінали:** `content/en/blog/slug.md` з `lang: "en"`. URL `/en/blog/slug/`. `translation_status: complete`.

---

## 5. ТЕГИ

**Перейменування:** `tags` → `topics` (у Eleventy `tags` — службовий ключ колекцій).

**Контрольований словник:** `content/shared/topics.json` (≤ 6, ≤ 3 на пост).

**Сторінок `/blog/tags/` і `/blog/archive/` наразі немає.** Не створюй
архівне групування за роками чи тегами, доки обсяг дописів не виправдовує
окрему навігацію; поле `entry` лишається нумерацією окремих дописів.

---

## 6. ДАТИ

**Формат:** ISO 8601 з `timeZone: "UTC"`.

**Фільтр `ukDate`:** `Intl.DateTimeFormat` з `formatToParts` (прибрати «р.»).

**`lastmod` в sitemap:** `updated` або `date`.

---

## 7. СКРИПТИ

| Скрипт | Призначення |
|--------|-------------|
| `check.mjs` | Бюджети, CSS-патерни, hex, origin, h1, alt, entry |
| `validate-content.mjs` | Обов'язкові поля, ISO, довжини, slug, consent |
| `plan-lint.mjs` | Нумерація та перехресні посилання PLAN/DECISIONS, README і STATE |
| `voice-lint.mjs` | Заборонені слова, соцмережі, емодзі, UTM |
| `export-devto.mjs` | Експорт девлогів з dev.to API |

**Autonomous:** Без npm-залежностей. Node.js API.

**Git-хук:** `git config core.hooksPath scripts/hooks`. Pre-commit: `npm run check`.

**Build-команда Netlify:** `npm ci --ignore-scripts && npm run build && npm run check`.

---

## 8. ПАКЕТ

**`package.json`:**

```json
{
  "name": "koztechie-fyi",
  "type": "module",
  "scripts": {
    "dev": "eleventy --serve",
    "build": "eleventy && node scripts/postbuild.mjs",
    "check": "node scripts/check.mjs",
    "size": "node scripts/size-budget.mjs",
    "palette": "node scripts/palette-check.mjs",
    "validate": "node scripts/validate-content.mjs content/"
  },
  "dependencies": {
    "@11ty/eleventy": "3.1.7"
  }
}
```

**Точна версія** `3.1.7` (без `^`). `package-lock.json` у коміті.

---

## 9. NETLIFY

**`netlify.toml`:**

```toml
[build]
  command = "npm ci --ignore-scripts && npm run build && npm run check"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22.22.2"

# Крок PLAN 158: koztechie.pp.ua → 301 — у static/root/_redirects
# (домен-рівневі редиректи; єдине джерело — _redirects).
```

**`static/root/_redirects`:**

```
# Крок PLAN 158: koztechie.pp.ua → .fyi; www.koztechie.fyi → apex.
# Тримати pp.ua, поки .fyi не проіндексований; після індексації — видалити.
# Домен-рівневі редиректи (доки Netlify, "Domain-level redirects").
# `!` (force): без нього правило не спрацює на / — існує index.html (shadowing).
# Явні http/https правила www.fyi згортають перший візит до канону одним хопом.

http://www.koztechie.fyi/* https://koztechie.fyi/:splat 301!
https://www.koztechie.fyi/* https://koztechie.fyi/:splat 301!
http://koztechie.fyi/* https://koztechie.fyi/:splat 301!
https://koztechie.netlify.app/* https://koztechie.fyi/:splat 301!
https://koztechie.pp.ua/* https://koztechie.fyi/:splat 301!
http://koztechie.pp.ua/* https://koztechie.fyi/:splat 301!
https://www.koztechie.pp.ua/* https://koztechie.fyi/:splat 301!
http://www.koztechie.pp.ua/* https://koztechie.fyi/:splat 301!
```

**`static/root/_headers`:**

```
# Заголовки безпеки (PLAN 160): секція /* — на весь сайт.
/*
  Content-Security-Policy: default-src 'self'; img-src 'self'; style-src 'self'; script-src 'none'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY

# Декларативна політика noai (PLAN 122/313): X-Robots-Tag на рівні хостингу.
# Ті самі шляхи, що в robots.txt: поезія та тексти авторські.

/poetry/*
  X-Robots-Tag: noai, noimageai

/en/poetry/*
  X-Robots-Tag: noai, noimageai

/blog/*
  X-Robots-Tag: noai, noimageai

/en/blog/*
  X-Robots-Tag: noai, noimageai
```

---

## 10. ПРАВИЛА

- Контент-моделі: `content-model.md` (канон). Не дублюй тут.
- `.env` не існує. Секретів немає.
- `red-lines.md` і `DEATH.md` — поза коренем проєкту.
- `docs/` — лише публічне.
- Усі сторінки проходять `npm run check` до коміту.
- Білд на хостингу повторює перевірку.
