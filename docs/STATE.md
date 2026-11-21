# STATE.md: МАШИНА СТАНІВ (ВУЗОЛ-0)

**Статус: ЗАТВЕРДЖЕНО** (аудит 2).

**Правило:** Агент зчитує цей файл на початку кожної сесії. Оновлює в кінці.

---

## 1. Поточний стан

| Поле | Значення |
|------|----------|
| Фаза | C (антикрихкість; вихід не підтверджено; відкриті кроки A/B лишаються окремими блокерами) |
| Крок | 318 — вихід із Фази C / БРАМА 10 (`⏳`) |
| Рівень енергії | [ОНОВЛЮВАТИ ВРУЧНУ, 0–10] |
| Блокери | 155: потрібен експорт Facebook; 166: не підтверджене подання sitemap у GSC; БРАМА 6: анонс не підтверджено; БРАМИ 7–9: лишилися незавершені контентні й тестові кроки; БРАМА 10: D-01…D-10, D-21, G-13 і zero-to-live не підтверджені. Ручний AT-аудит незавершений, але не блокує deploy або вихід із Фази C |

---

## 2. Протокол сесії

1. Прочитай цей файл і `PLAN.md`.
2. Перевір рівень енергії. ≤ 3/10 — лише тексти, docs. Код заборонено.
3. Виконай 3–7 кроків. Максимум 90 хвилин.
4. `git commit` кожні 1–3 кроки.
5. Виведи список змінених файлів.
6. Онови цей файл.

**Правило сирени:** Тривога → `git add . && git commit -m "WIP: Сирена" && git push` → укриття.

---

## 3. Брами

| Фаза | Кроки | Брама | Умова | Статус |
|------|-------|-------|-------|--------|
| A | 1–24 | 0 | `DECISIONS.md` існує; `red-lines.md` у `.gitignore` | ✅ 2026-10-18 |
| A | 25–52 | 1 | `sitemap.md` + `content-model.md`; жодної сторінки без призначення | ✅ 2026-10-17 |
| A | 53–76 | 2 | Проєкт збирається; бюджети записані | ✅ 2026-10-18 |
| A | 77–104 | 3 | `design-system.md`; 6 CSS-файлів; ≤ 15 КБ | ✅ 2026-10-18 |
| A | 105–136 | 4 | Сайт збирається; мови працюють; RSS валідний | ✅ 2026-10-25 |
| A | 137–168 | 5 | Сайт живе на `koztechie.fyi`; історія чиста | ✅ 2026-11-07 |
| A | 169–200 | 6 | ≥ 14 днів; баги закриті; анонс опубліковано; репозиторій публічний | ⏳ Репозиторій public, відкритих GitHub issues 0; анонс/пост і двотижневий підсумок не підтверджені (PLAN 192–193, 198–199) |
| B | 201–229 | 7 | Палітра NICHLYST зелена; юридичне правило дотримано; лінки живі | ⏳ Акт 7 не завершено: у PLAN 201–229 виконання повністю не підтверджене |
| B | 230–268 | 8 | Усі розділи; жодних «скоро» | ⏳ Незавершені контентні кроки; зокрема PLAN 234–256 і відкриті редакційні блокери |
| B | 269–279 | 9 | Усі перевірки зелені | ⏳ Ручне читання та ACT 9 не підтверджені; Reflow matrix у run 44824303294 завершився failure, тепер це інформаційний звіт, не release gate |
| C | 280–318 | 10 | Ритм, ранбук, тест смерті й аудит публічних тверджень: machine gate або ACCEPT | ⏳ D-01…D-10, D-21, G-13 і zero-to-live не підтверджені; D-16 production PASS у run 44824303294. Ручний AT-аудит не блокує фазу чи deploy |

---

## 4. Лог сесій

| Дата | Кроки | Змінені файли | Статус |
|------|-------|---------------|--------|
| 2026-10-17 | 0 | Ініціалізація документації | Готово до старту Фази A |
| 2026-10-17 | 1 | `DECISIONS.md` §1 | Роль сайту зафіксовано |
| 2026-10-17 | 2 | `DECISIONS.md` §1.3, §1.4 | Кодова назва ВУЗОЛ-0 та зв'язок з NICHLYST |
| 2026-10-17 | 3 | `DECISIONS.md` §11 | Слоган «Текст без прикрас.» затверджено |
| 2026-10-17 | 4 | `DECISIONS.md` §1.2 | Голос: сухий, літературний, самоіронічний |
| 2026-10-17 | 5 | `DECISIONS.md` §1.5 | Заборонена лексика: 9 слів |
| 2026-10-17 | 6 | `DECISIONS.md` §1.6 | Метафора: читач у сховищі |
| 2026-10-17 | 7 | `red-lines.md` | Категорії, не конкретика |
| 2026-10-17 | 8 | (ручний крок) | red-lines.md + DEATH.md поза проєктом |
| 2026-10-17 | 9 | (ручний крок) | Зашифрований бекап (AES-256) |
| 2026-10-17 | 10 | `DECISIONS.md` §37 | WHOIS + автопродовження + 2FA зафіксовано |
| 2026-10-17 | 11 | (ручний крок) | 2FA TOTP + резервні коди в менеджері паролів |
| 2026-10-17 | 12 | `DECISIONS.md` §19.0 | Мовна схема: uk в корені, en в /en/ |
| 2026-10-17 | 13 | `facts.md` | 20 фактів: 7 заповнено, 13 плейсхолдерів |
| 2026-10-17 | 14 | `DECISIONS.md` §16 | Три обіцянки читачу |
| 2026-10-17 | 15 | `DECISIONS.md` §15 | Обіцянка собі: пріоритет гри, сон, енергія |
| 2026-10-17 | 16 | `DECISIONS.md` §5 | Метрики: 12 місяців, 1–2 контакти, нуль сорому |
| 2026-10-17 | 17 | `vanity-refusal.md` | Письмова відмова від vanity-метрик |
| 2026-10-17 | 18 | `DECISIONS.md` §3.1 | Аналітика: нічого. Umami заборонено |
| 2026-10-17 | 19 | `DECISIONS.md` §3.3 | Коментарі: немає. Єдиний канал — email |
| 2026-10-17 | 20 | `DECISIONS.md` §3.4 | Соцмережі: немає. GitHub у /colophon/ |
| 2026-10-17 | 21 | `DECISIONS.md` §6 | Анти-шаблонні правила |
| 2026-10-17 | 22 | `DECISIONS.md` §7 | Правило тиші: ≥ 120px |
| 2026-10-17 | 23 | `DECISIONS.md` §8 | Розбите дзеркало: чесний текст |
| 2026-10-17 | 24 | `DECISIONS.md` §9 | Книга, не стрічка |
| 2026-10-17 | 25 | (ручний крок) | Мапа сайту намальована від руки |
| 2026-10-17 | 26 | `DECISIONS.md` §4 | Верхній рівень: 10 сторінок |
| 2026-10-17 | 27 | `DECISIONS.md` §17 | Службові: 404, privacy, RSS, sitemap |
| 2026-10-17 | 28 | `sitemap.md` | Призначення кожної сторінки |
| 2026-10-17 | 29 | `DECISIONS.md` §18 | Одна думка — один URL |
| 2026-10-17 | 30 | `DECISIONS.md` §19 | URL-схема: uk в корені, en в /en/ (дубль кроку 12) |
| 2026-10-17 | 31 | `DECISIONS.md` §20 | Заборона дат в URL |
| 2026-10-17 | 32 | `DECISIONS.md` §21 | Резерв: /nichlyst/ та /en/nichlyst/ |
| 2026-10-17 | 33 | `DECISIONS.md` §3, §4, §17.1, §17.3 | Синхронізація: Play, archive, 404+навігація, два фіди |
| 2026-10-17 | 34 | `content-model.md` §5.1 | Контент-модель поста (вже існувала) |
| 2026-10-17 | 35 | `content-model.md` §3.1 | translation_status: complete/partial/not_planned |
| 2026-10-17 | 36 | `content-model.md` §5.5 | Контент-модель статичної сторінки |
| 2026-10-17 | 37 | `content-model.md` §5.2 | Контент-модель кейсу (7 секцій) |
| 2026-10-17 | 38 | `content-model.md` §5.2 | «Що це мені дало»: 1–3 пункти, без пафосу |
| 2026-10-17 | 39 | `content-model.md` §5.3 | Контент-модель цвинтаря (4 поля) |
| 2026-10-17 | 40 | `content-model.md` §5.4 | Контент-модель вірша (4 поля) |
| 2026-10-17 | 41 | `content-model.md` §3.1 | entry: незмінний, одна послідовність |
| 2026-10-17 | 42 | `inventory.md` | Інвентаризація (вже існувала) |
| 2026-10-17 | 43 | `inventory.md` §8 | Правило допустимих правок: без змістовного редагування |
| 2026-10-17 | 44 | `inventory.md` §1, §9 | Позначка: потребує переписування |
| 2026-10-17 | 45 | `inventory.md` §10.1 | 6 тем до запуску: 11 сторінок |
| 2026-10-17 | 46 | `DECISIONS.md` §27 | Частота: ≤ 1 пост на тиждень |
| 2026-10-17 | 47 | `DECISIONS.md` §28 | Редакційна політика: іменники, не оклики |
| 2026-10-17 | 48 | `DECISIONS.md` §29 | Заборона «списків з 10 способів» |
| 2026-10-17 | 49 | `DECISIONS.md` §30 | RSS: повні тексти без обрізок |
| 2026-10-17 | 50 | `DECISIONS.md` §31 | Час читання: ≈ N хв, 180 слів/хв |
| 2026-10-17 | 51 | `DECISIONS.md` §32 | Контент-попередження для важких текстів |
| 2026-10-17 | 52 | **БРАМА 1** | sitemap.md + content-model.md + DECISIONS синхронізовано |
| 2026-10-17 | 53 | `environment.md` (новий) | Перевірка машини: A4-4020, збірка 6,05 с / 96 МБ RAM |
| 2026-10-17 | 54 | `environment.md` §5 | Бюджети пройдено: збірка 3,5–4,5 с, dev-сервер 91 МБ |
| 2026-10-17 | 55 | `DECISIONS.md` §38 | Eleventy v3.1.7 затверджено як єдина залежність |
| 2026-10-17 | 56 | `DECISIONS.md` §39, `TECH_STANDARDS.md` §4.0 | CSS: рукописний, кастомні властивості. Виправлено brotli-баг у check.mjs |
| 2026-10-17 | 57 | `DECISIONS.md` §40, `TECH_STANDARDS.md` §5 | JS: нуль. check.mjs 7а: .js, <script>, on*, javascript: |
| 2026-10-17 | 58 | `DECISIONS.md` §41, `TECH_STANDARDS.md` §6 | Шрифти: системний стек + 1 woff2. check.mjs 7б |
| 2026-10-17 | 59 | GitHub `koztechie/koztechie-fyi` | Репозиторій приватний. git init + 21 файл + push |
| 2026-10-17 | 60 | `.gitignore` | Наявний: node_modules, dist, _site, .env — верифіковано в коміті |
| 2026-10-17 | 61 | `LICENSE`, `COPYRIGHT` | Код: ISC. Контент: © всі права. check.mjs 7г |
| 2026-10-17 | 62 | `README.md` (новий) | Що це, як зібрати, як написати пост. 141 рядок |
| 2026-10-17 | 63 | `AGENTS.md` §7, §3 | Межі контенту: 7 категорій, абстракція, протокол. JS: 0 байт узгоджено |
| 2026-10-17 | 64 | `AGENTS.md` §6 | Правило: відповідь про код → блок «ЗМІНЕНІ ФАЙЛИ». Верифіковано |
| 2026-10-17 | 65 | `scripts/check.mjs` 7д | Політика залежностей: allowlist, точна версія, lock, порожні devDeps |
| 2026-10-17 | 66 | `opencode.jsonc` (новий) | Проєктна конфігурація: модель, instructions, 6 дозволів, 3 команди |
| 2026-10-18 | 67 | `docs/session-template.md`, `opencode.jsonc` | Шаблон сесії: промпт + /start. Узгоджено з STATE.md §2 |
| 2026-10-18 | 68 | `AGENTS.md` §5, `session-template.md` | Дисципліна 3–7 кроків ≤ 90 хв узгоджено в 4 документах |
| 2026-10-18 | 69 | `package.json`, `package-lock.json` | Скелет: 4 скрипти, Eleventy 3.1.7 точною версією |
| 2026-10-18 | 70 | `.nvmrc` (новий), `ARCHITECTURE.md` | Node 22.22.2. Виправлено NODE_VERSION 20→22. check.mjs 7е |
| 2026-10-18 | 71 | 17 `.gitkeep` у `src/`, `static/`, `content/` | Структура тек за канонічним деревом |
| 2026-10-18 | 72 | `eleventy.config.js`, `.eleventyignore`, `postbuild.mjs` | Смоук-тест: 0,35 с, md→html, без .gitkeep у dist |
| 2026-10-18 | 73 | `scripts/hooks/pre-commit` | Хук: блокує dist/, .env, node_modules + check. 5/5 тестів |
| 2026-10-18 | 74 | `scripts/size-budget.mjs` | Бюджети: 7 розділів, 10 тестів, feed.xml = попередження |
| 2026-10-18 | 75 | `TECH_STANDARDS.md` §1, `size-budget.mjs` 8 | Бюджет сайту ≤ 2 МБ (без зображень і feed.xml) |
| 2026-10-18 | 76 | **БРАМА 2** | Збірка, бюджети, запушено. red-lines.md: перепис історії, файл у ~/koztechie-private/ |
| 2026-10-18 | 77 | `design-system.md` (новий) | Естетика «Арктичний глітч-мінімалізм»: 3 риси, 5 принципів |
| 2026-10-18 | 78 | `design-system.md` §2, `check.mjs` | Заборони: градієнти, тіні, radius, гласморфізм, 3D. conic-gradient у check |
| 2026-10-18 | 79 | `design-system.md` §3 | Мудборд: 6 референсів, всі живі, межі «що/що ні» |
| 2026-10-18 | 80 | `anti-references.md`, 3 SVG-макети | Антиреференси: векторні макети замість скриншотів, 13 КБ |
| 2026-10-18 | 81 | `design-system.md` §4.1, `palette-check.mjs` | Палітра «ПАПІР»: 6 hex, AAA 7,85–16,77:1, 4 тести |
| 2026-10-18 | 82 | `design-system.md` §4.2 | Палітра «БУНКЕР»: 6 hex, AAA 7,66–15,83:1. Обидві зелені |
| 2026-10-18 | 83 | `design-system.md` §4.3 | Контраст AAA ≥ 7:1: 16 пар, формула WCAG, винятки |
| 2026-10-18 | 84 | `design-system.md` §4.3.6 | Семантичні кольори: відмова. Сайт без форм не має станів |
| 2026-10-18 | 85 | `src/styles/themes.css` | 6 змінних × 2 теми. palette-check: CSS ↔ документ |
| 2026-10-18 | 86 | `design-system.md` §4.4, `palette-check.mjs` | Ліміт 6 канонізовано. Альфа-hex заборонено явно |
| 2026-10-18 | 87 | `src/styles/core.css`, `design-system.md` §5.1 | Стек тексту: Georgia → Times → Noto Serif → serif |
| 2026-10-18 | 88 | `src/styles/core.css`, `design-system.md` §5.5–5.7 | UI: системний гротеск. Правило: body = --font-text |
| 2026-10-18 | 89 | `static/fonts/JetBrainsMono-Regular-subset.woff2`, `core.css` | Моно: JetBrains Mono OFL, сабсет 457 гліфів, 33,4 КБ |
| 2026-10-18 | 90 | `src/styles/core.css`, `design-system.md` §5.9 | Шкала: ratio 1.25, 5 розмірів, 4 пари = 1.2500 |
| 2026-10-18 | 91 | `src/styles/core.css`, `design-system.md` §5.10 | Ритм: line-height 1.6, ширина 68ch (ch-одиниця) |
| 2026-10-18 | 92 | `src/styles/core.css`, `design-system.md` §5.11 | Буквиця: .dropcap::first-letter, float, 3.4em, без JS |
| 2026-10-18 | 93 | `design-system.md` §6 | Whitespace ≥ 20%: рахунок від --bg, ручна верифікація |
| 2026-10-18 | 94 | `src/styles/core.css`, `design-system.md` §7.1 | Лінійка запису: .entry-line, моно, uppercase, незмінний entry |
| 2026-10-18 | 95 | `src/styles/core.css`, `design-system.md` §7.2 | Мікрогліч h1: 150 мс, transform/opacity, reduced-motion |
| 2026-10-18 | 96 | `src/styles/core.css`, `design-system.md` §7.3 | Курсор ▍: .cursor-blink, step-end 1s, reduced-motion → none |
| 2026-10-18 | 97 | `design-system.md` §7.4 | Вичерпний перелік: 3 сигнатурі, четверта заборонена |
| 2026-10-18 | 98 | `src/styles/core.css`, `design-system.md` §8.1 | Перемикач мови: .lang-switch, УКР/ENG, без авто-детекту |
| 2026-10-18 | 99 | `design-system.md` §8.2 | Тема: без перемикача, без збереження. prefers-color-scheme |
| 2026-10-18 | 100 | 4 SVG у `docs/wireframes/`, `design-system.md` §9 | Вайрфрейми: головна, стаття, кейс, цвинтар |
| 2026-10-18 | 101 | `design-system.md` §9.6 | Шапка: логотип-текст, 5 лінків, [ АКТИВНИЙ ], мова |
| 2026-10-18 | 102 | `design-system.md` §9.7 | Підвал: 5 лінків, ©, RSS, email, «Зроблено в Києві» |
| 2026-10-18 | 103 | `design-system.md` §9.8 | 404: архівна картка, навігація обов'язкова, HTTP 404 |
| 2026-10-18 | 104 | **БРАМА 3** | 6 CSS: core, layout, components, themes, print, nichlyst. 3,4 КБ brotli |
| 2026-10-18 | 105 | `src/templates/base.njk` | Базовий шаблон: html lang, head, header, main, footer. 6 блоків |
| 2026-10-18 | 106 | `src/templates/base.njk` | Head: charset, viewport, title, description, theme-color ×2 |
| 2026-10-18 | 107 | `scripts/check.mjs` 7ж | Head: 7 детекторів сторонніх ресурсів (preconnect, refresh, base, script, //, @import, link) |
| 2026-10-18 | 108 | `src/templates/header.njk` | Паршал шапки: логотип-текст, 5 лінків, aria-label. default блока header |
| 2026-10-18 | 109 | `src/templates/footer.njk` | Паршал підвалу: 5 лінків, ©, RSS, email, «Зроблено в Києві». default блока footer |
| 2026-10-18 | 110 | `src/templates/header.njk` | Активний розділ: aria-current + CSS [ ]. Нормалізація /en/. 8 тестів |
| 2026-10-18 | 111 | `header.njk`, `eleventy.config.js` | Перемикач мов: дзеркало або заглушка /en/. Фільтр findByUrl. 4 сценарії |
| 2026-10-25 | 112 | `src/templates/base.njk` | hreflang: uk/en/x-default + canonical. noindex-умова. Блок для 404 |
| 2026-10-25 | 113 | `src/templates/home.njk` | Лейаут головної: h1+лід, маніфест, 3 записи (.entry-line). Стійкий до порожніх колекцій |
| 2026-10-25 | 114 | `post.njk`, `eleventy.config.js` | Лейаут поста: лінійка, метадані, буквиця (з перевіркою), §32. Фільтри ukDate/readingTime/dropcapReady |
| 2026-10-25 | 115 | `list.njk`, `components.css` | Лейаут списку: h1, intro, архів, пагінація «Сторінка 1,2,3» + лічильник. 6 тестів |
| 2026-10-25 | 116 | `src/templates/page.njk` | Лейаут статичної сторінки: h1, тіло, курсор ▍ лише /manifest/. Без буквиці |
| 2026-10-25 | 117 | `eleventy.config.js`, `src/_data/strings/`, 4 шаблони | i18n: колекції uk/en, словники uk/en.json (46 ключів), вибір мови в шаблонах |
| 2026-10-25 | 118 | 7 шаблонів, `check.mjs` 7з, `eleventy.config.js` | Хардкод UI → словники. Фільтр plural (uk 3 / en 2 форми). Лінтер 7з: 110 значень |
| 2026-10-25 | 119 | `validate-content.mjs`, `check.mjs` 7з | Словники 48/48 повні, канонічні, без плейсхолдерів. Валідатор читає зі словників, en-кейси → en-секції. Парність у 7з |
| 2026-10-25 | 120 | 10 `*.11tydata.json`, 2 index.md, `validate-content.mjs` | Маршрути: uk без префікса, en → /en/. Явний permalink пріоритетний. Типи section/home, lang зі шляху |
| 2026-10-25 | 121 | `src/sitemap.njk`, `eleventy.config.js`, `check.mjs` | sitemap.xml: обидві мови, noindex/404 поза, lastmod ISO. Фільтр isoDate. Переклади не дублікати entry |
| 2026-10-25 | 122 | `static/root/robots.txt`, `static/root/_headers`, `check.mjs` 7и | ШІ-політика: 16 ботів, Disallow поезії/блогу (+en), Sitemap. Примус: X-Robots-Tag ×4 |
| 2026-10-25 | 123 | `src/404.njk`, `base.njk` | 404: «Запис відсутній.», шапка обов'язкова, поза sitemap/hreflang. Виправлено баг: порожні title/description з кроку 117 |
| 2026-10-25 | 124 | `src/templates/home.njk` | Час читання 180 слів/хв: 13 тестів фільтра, uk «хв»/en «min». Виправлено: home на templateContent (поле reading_time не існувало), мовна ізоляція, ліміт за відібраними |
| 2026-10-25 | 125 | `src/feed.njk`, `eleventy.config.js`, `base.njk` | RSS 2.0 два фіди: повні тексти в CDATA, guid=link, RFC 822. Авто-discovery ×2. Вбудований масив pagination.data не працює — глобальні feedLangs |
| 2026-10-25 | 126 | `scripts/check.mjs` 7і | Валідація фідів: XML-каркас, канал, guid=link, RFC 822, §30.3 заборони. 6 негативних тестів |
| 2026-10-25 | виправлення | `eleventy.config.js`, `core.css`, `layout.css`, `components.css`, `check.mjs` 1d | Перегляд у браузері виявив 2 баги: (1) passthrough клав ассети в dist/src/ та dist/static/ → усі CSS/шрифти 404; (2) типографічна база (body/h1 шкала) ніколи не була написана. Виправлено + перевірка 1d |
| 2026-10-25 | 127 | `now.njk`, `content/{uk,en}/pages/now.md`, `validate-content.mjs`, `strings` | /now: шаблон з секціями (season/working_on/reading/energy), перший зміст з HIGH-фактів. En-версія. Валідатор: now.njk у VALID_LAYOUT. 52/52 ключі |
| 2026-10-25 | 128 | `content/{uk,en}/pages/contact.md`, `strings`, `footer.njk`, `docs/infra-email.md` | /contact: entity-захист email скрізь (0 plain у dist), без форм/дзвінків/JS. Виявлено: md декодує entity у тексті — текст лінка без патерну, читабельна адреса з footer. Proton-налаштування задокументовано |
| 2026-10-25 | 129 | `content/{uk,en}/pages/privacy.md`, `footer.njk`, `layout.css`, `voice-lint.mjs` | /privacy: канон §17.2 без плейсхолдера (Netlify), розділ NICHLYST/RevenueCat, footer-лінк. Виправлено voice-lint: \b не працює з кирилицею, лапки-назва ≠ заклик |
| 2026-10-25 | 130 | `content/{uk,en}/pages/colophon.md`, `check.mjs` 4 | /colophon: шрифти/інструменти/залізо (environment.md), кіт «Укроп» останнім (§13, 1 згадка), єдине GitHub-посилання. check4: github.com — канонічне виняток §277 |
| 2026-10-25 | 131 | 12 нових md, `list.njk`, `header.njk`, `footer.njk`, 10 `*.11tydata.json` | Збірка: 22 сторінки (11 розділів × 2 мови) + службові. Маніфест §14.1+14.2 з курсором. Виправлено: fileSlug для index.md = назва теці; list fallback без pagination; мовна навігація header/footer (en → /en/*) |
| 2026-10-25 | 132 | `scripts/linkcheck.mjs`, `check.mjs` 7к, `package.json` | linkcheck: 622 лінки, нуль битих (внутрішні, якорі, mailto, sitemap loc, RSS link). 7 негативних тестів. npm run linkcheck + check 7к |
| 2026-10-25 | 133 | `check.mjs` 7л, `linkcheck.mjs` (export) | Перевірка перемикача мов на 23 сторінках: current за мовою, лінки цілі, УКР перша, aria-hidden, поточна не лінк. 6 негативних тестів |
| 2026-10-25 | 134 | `core.css`, `check.mjs` 7м | Таб-навігація: глобальний :focus-visible outline 2px accent (раніше був відсутній — лише color). 7м: CSS-правило, без outline:none, без позитивного tabindex, <a> без href. 5 негативних тестів |
| 2026-10-25 | 135 | `base.njk`, `layout.css`, `check.mjs` 7н, `strings` | Skip-link: перший елемент body, main id="main", :focus видимий (1rem/z100/ПАПІР). Ключ nav.skip. 7н: 23/23 сторінок + 3 негативи. Виправлено порівняння позиції (клас ≠ тег) |
| 2026-10-25 | 136 | **БРАМА 4** | Збірка 4 с (бюджет 60), check 0 помилок (14 розділів), 23 сторінки (11×2), 645 лінків цілі, RSS 2.0 валідний (items: guid=link, RFC822, CDATA), бюджети: HTML 4.7/50, CSS 4.7/15, шрифт 33.4/60, сайт 280K/2МБ. Валідатор 0/0 (прибрано хибні «порожнє тіло» для лейаут-сторінок) |
| 2026-10-25 | 137 | `home.njk`, `layout.css`, `strings` | Заголовок головної uk: «Архів свідчень, коду та спостережень.» — фраза під h1 (h1 = ВУЗОЛ-0 за §9.1). En-паралель додано (парність 55/55). Голос чистий |
| 2026-10-25 | 138 | верифікація | Паралельна фраза en: структура 3↔3 складники, uk ≠ en, голос чистий, рендер обома мовами, лід не дублює тезу |
| 2026-10-25 | 139 | `strings` | Лід: 3 речення без епітетів обома мовами (3↔3): «Один запис — одна думка…» / «One entry, one thought…». Опори: §18, §27, §9.2, §14.2, §173. Не дублює фразу-заголовок |
| 2026-10-25 | 140 | `home.njk`, `layout.css`, `strings`, `check.mjs` 7з | Блок «Що це»: 3 пункти (автор/мови/код), uk↔en. 7з: collectValues рекурсивний для масивів-об'єктів (138 значень). Виправлено баг: індекс blog потрапляв у «Останні записи» (без date-фільтра) |
| 2026-10-25 | 141 | `home.njk`, `layout.css`, `strings` | Блок «Розділи»: 9 пунктів за sitemap, моно-нумерація CSS counter (01–09, JetBrains Mono), лінки мовно-залежні. Порядок: what → sections → manifest |
| 2026-10-25 | 142 | верифікація | «Останні записи»: 3/3 ліміт, новіші першими (№5→4→3), .entry-line, час читання, мовна ізоляція, без індексів. Код не змінювався (кроки 113/140) |
| 2026-10-25 | 143 | `home.njk`, `layout.css`, `strings` | Блок NICHLYST: один рядок + анкор «NICHLYST» (§21.1, не голий URL), мовно-залежний href. Канон §1.4/§21.3. Парність 59/59 |
| 2026-10-25 | 144 | верифікація | Фінальний рядок §9.7.2: точний збіг з каноном, 1 раз на головній (футер, без дубля §18), 23/23 сторінок своєю мовою (12 uk + 11 en) |
| 2026-10-25 | 145 | `content/{uk,en}/pages/nichlyst.md`, `components.css`, `linkcheck.mjs`, `check.mjs` | Мінімальний /nichlyst: преміса (DT §3.1), контент-попередження (платна покупка) зі стилем .content-warning, Play-лінк (пакет com.koztechie.nichlyst), дисклеймер Google. play.google.com у дозволених origin |
| 2026-10-25 | 146 | `content/uk/index.md`, `home.njk`, `validate-content.mjs` | Meta description uk: summary головної (96 символів), блок description у home. Валідатор: warning 156–160 (PLAN146 vs §8), error >160. 23/23 ≤155 |
| 2026-10-25 | 147 | `content/en/index.md` | Meta description en: паралельна до uk (96 символів, 3↔3 речення). Аудит 23/23 ≤155. Голос чистий |
| 2026-10-25 | 148 | `static/og/home.{svg,png}`, `base.njk`, `home.njk`, `eleventy.config.js` | OG-картинка: SVG-джерело (палітра ПАПІР, типографіка) → PNG 1200×630, 44 КБ/80. OG-теги ×9 (locale uk_UA/en_US, блоки og:title/og:description). Passthrough static/og |
| 2026-10-25 | 149 | `check.mjs` 5 | Один h1: посилено на «рівно 1» (ловить і 0, і дубль). 23/23 h1, 0 порожніх лінків у 26 файлах. 4 негативи |
| 2026-10-25 | 150 | `home.njk`, `footer.njk` | En-головна: маніфест-секція мовно-залежна (/en/manifest/ + en summary), footer RSS → /en/feed.xml. 0 uk-слів у контенті en |
| 2026-10-25 | 151 | `schema.json`, `home.njk`, `eleventy.config.js`, `check.mjs` | JSON-LD Person+WebSite (@graph): name одне, alternateName ×3 (DT F-01/F-02), sameAs лише GitHub. Фільтр json. check: stripJsonLd у 7а/7ж — ld+json дозволений, звичайні скрипти ловляться |
| 2026-10-25 | 152 | `check.mjs` 7о | Валідація JSON-LD: JSON-parse, @context, @graph, Person (name/alternateName/sameAs тільки GitHub), WebSite (name/url koztechie.fyi/description). 4 негативи → 7 помилок |
| 2026-10-25 | 153 | `check.mjs` 7п | Canonical: 22/22 сторінки — абсолютні, self-reference, унікальні, 404 поза. 5 типів негативів (без/чужий/не-self/дубль/на 404) |
| 2026-10-25 | 154 | `content/{uk,en}/blog/blog-manifesto.md`, `validate-content.mjs` | Перший пост (entry 1): маніфест блогу за §18/§27/§28. En-паралель. Валідатор: переклади не дублікати entry (нормалізація шляху). Головна/список/RSS/sitemap живі |
| 2026-10-26 | 156 | `content/{uk,en}/graveyard/svitlogics.md`, `src/templates/stub.njk`, `src/_data/strings/{uk,en}.json`, `src/templates/list.njk`, `docs/inventory.md` | Епітафія G4 (entry 2): період/причина/епітафія — рішення автора; провенанс — без позначки (рішення); скан red-lines §2.3 = дозволено. Заглушка §35 (noindex → поза sitemap/hreflang). Виправлено регресію 155: `for...if` у nunjucks не рендерить → `for + if` у list.njk (списки були порожні) |
| 2026-10-26 | — | `static/fonts/*`, `core.css`, `check.mjs`, `design-system.md` §5.8/§7.3, `DECISIONS.md` §41, `TECH_STANDARDS.md` §6, колофон uk/en | Аудит шрифтів (завдання автора): JetBrains Mono → **IBM Plex Mono** (критерій походження; PT/ParaType у проєкті не було). Новий сабсет: 500 гліфів / 13,6 КБ (було 457 / 33,4; кирилиця 122→168 з 256). Діапазони очищено від невживаних `▪ ― ‐ ‟`; «повний блок» у §5.8.1 замінено на чесне покриття (перевірка cmap); прибрано неправдиву тезу 0/O. Усі `font-family` — через змінні (консистентність CSS) |
| 2026-10-26 | — | `scripts/check.mjs` (розділ 2), `src/styles/components.css`, `design-system.md` §6.5 | Аудит відступів/меж (завдання автора): рем-сітка 0.25rem закріплена автоматично — чек зловив7 відхилень (0.15/0.42/0.6/0.7/1.1/1.2/1.4), усі нормалізовано. Межі: два класи (rule-роздільник + accent-стан), радіусів немає. Em-клас і clamp задокументовано в §6.5 |
| 2026-10-26 | — | меню+слаг: strings ×2, header, home, feed, config, validate-content, `content/{uk,en}/{graveyard→cemetery}/` (data-файли перейменовано), ~20 docs-файлів | Меню: Кладовище/Зараз/Контакти; en Contact (Contacts відкочено), en Cemetery. Слаг секції `graveyard` → **`cemetery`**: маршрути, колекція, тип валідатора, permalink-и, усі route-таблиці. §34.3: Cemetery — канонічний, Graveyard — заборонений. До запуску 301 не потрібні. Навмисно без змін: PLAN.md, історія STATE, вайрфрейм |
| 2026-10-26 | — | `header.njk`, `footer.njk`, `sitemap.md`, `DECISIONS.md` §4, `design-system.md` §9.6–§9.8 | IA-навігація за аудитом практик (NN/g, Iowa, Maryland, Baymard, EMBL): шапка = 5 розділів змісту за спадною активністю (NICHLYST, Блог, Практика, Поезія, Кладовище), підвал = 4 орієнтації (Маніфест, Зараз, Колофон, Контакт), Головна — логотип (aria-current), без дублювання. Виправлено застаріле «Стан» → «Зараз» у таблицях місць |
| 2026-11-05 | — | `home.njk`, `footer.njk`, `eleventy.config.js`, словники uk/en, CSS (components/layout/print), `scripts/check.mjs` (коментар), `DECISIONS.md` §1.7, `design-system.md` §9.7 | Головна за спеком автора: герой → «Коротко про сайт» → «Основні принципи» → «Що тут є» (9 описів) → «Останні записи» (№ · назва, час читання окремим рядком) → «Навіщо цей сайт» → «Головний проєкт». Прибрано: бровки §N, дует, лічильник розділів, вимірювання ваги (спек: «Розмір сторінки — До 50 КБ»). Паспорт: мови назвами з наявних дерев, дата «26 жовтня 2026 року» (новий фільтр `enDate` для en). Підвал: підпис «Інші сторінки», «Попри все», «Політика конфіденційності». §1.7 переписано під нові принципи |
| 2026-11-05 | — | `home.njk`, словники uk/en, `layout.css`, `DECISIONS.md` §1.7, `design-system.md` §9.7 | Фінальна редакція спека (§6, редакторський розбір): h1 «AI-assisted розробник і системний архітектор», новий лід (4 речення), паспорт «Про автора і сайт» (Мови сайту / Кількість сторінок / Обсяг сторінки / Оновлено, значення малими літерами), чотири нові принципи без афористичності, описи розділів скорочено, **блок маніфесту прибрано** (повтор теми — рішення §5), записи без № («Назва · Приблизно N хвилин читання.»), NICHLYST текстом + окремим виходом, місце — «Зроблено в Києві.» (друге речення прибрано) |
| 2026-11-07 | 157 | `netlify.toml`, `docs/deploy.md` | **Крок157 виконано:** деплой поточного контенту через Netlify MCP (проєкт `koztechie`; деплой `6aef2fce…` ready, 27 сторінок; pp.ua оновлено зі стану 03.09), DNS Spaceship (apex ALIAS → `apex-loadbalancer.netlify.com`, www → `koztechie.netlify.app`; старі A `34.216…/54.149…` перекриті), HTTPS Let's Encrypt видано (~10 хв) — `https://koztechie.fyi/` = 200; чек-лист `deploy.md §6` — усі 12 пунктів зелені. Домен додав автор; деплой/DNS/верифікація — ШІ (MCP netlify + spaceship). Залишок: 158 (pp.ua → 301), 160 (заголовки CSP), старий AWS-сервер, Git-лінк для автодеплою |
| 2026-11-07 | 158 | `static/root/_redirects`, `netlify.toml`, `docs/ARCHITECTURE.md` §9 | **Крок158 виконано:** `koztechie.pp.ua` → 301 на `koztechie.fyi` (домен-рівневі редиректи Netlify, 4 правила: https/http × apex/www, `301!` force через shadowing index.html). Деплой `6aef3e2a…` — «4 redirect rules processed». Верифікація: усі шляхи та query → 301 на `.fyi` (splat зберігається), ланцюжок http→https→fyi, `.fyi`/`netlify.app` → 200 без петлі, контент не постраждав. Джерело правил — `_redirects` (upload-деплой Netlify не обробляє `[[redirects]]` з `netlify.toml` — перевірено експериментально). Після індексації `.fyi` — видалити правила |
| 2026-11-07 | 159 | `scripts/check.mjs` (розділ 7і) | **Крок159 виконано:** перевірено всі редиректи — саме 301. Джерела в репо: єдине — `static/root/_redirects` (4 правила), meta-refresh немає, `netlify.toml` без `[[redirects]]`. Фактичні тести: GET/HEAD на усіх 9 ланцюжках (http/https × apex/www × шляхи/query) → **301**, штатні Netlify-редиректи (force SSL, www→apex, Pretty URLs) → 301; логи Netlify за 24 год: 3xx = 301 (338), 308 (52), 304 (34); **302/303/307 — 0**. 308 — виключно POST/OPTIONS (RFC: 308 ≡ 301 зі збереженням методу, штатна edge-поведінка, не налаштоване правило). Новий чек 7і: `_redirects` має містити лише 301 — негативний тест (302→4×❌, exit 1) пройдено |
| 2026-11-07 | 160 | `static/root/_headers` (секція `/*`), `scripts/check.mjs` (7и + 7р), `docs/ARCHITECTURE.md` §9 | **Крок160 виконано:** секція `/*` у `_headers` — усі5 заголовків безпеки за каноном §9: CSP (з `frame-ancestors 'none'`, `default-src 'self'`), HSTS `max-age=31536000; includeSubDomains`, Referrer-Policy `strict-origin-when-cross-origin`, Permissions-Policy (camera/microphone/geolocation), X-Content-Type-Options `nosniff`. Деплой `6aef4433…` («5 header rules processed»), live-верифікація: усі5 на головній/en/404/pp.ua, X-Robots-Tag на `/poetry/` зберігся (накладання секцій), CSS/h1 після CSP — без блокувань. Чек 7и розширено (6 маркерів секції `/*`; негативні тести: без Referrer-Policy → ❌/exit1, без `/*` → ❌/exit1); дубль маркера «7і» (редиректи) перейменовано на «7р». Канон §9 синхронізовано: прибрано мертві cache-секції `/assets/*` (шляху немає — асети в `/styles/`) і `/*.html` (дефолт Netlify уже `must-revalidate`) |
| 2026-11-07 | 161 | `scripts/check.mjs` (7и) | **Крок161 виконано:** CSP `default-src 'self'` — умова задоволена ще з кроку160 (live: `content-security-policy: default-src 'self'; img-src 'self'; …`; канон ARCHITECTURE §9 збігається). Закріплено чеком: у 7и додано точний маркер `default-src 'self'` (раніше достатньо було самого заголовка CSP — `default-src *` пройшов би); негативний тест (`default-src *` → ❌, exit=1) пройдено, відкат чистий. Змін у `_headers`/контенті не потрібно |
| 2026-11-07 | 162 | `scripts/postbuild.mjs`, `scripts/check.mjs` (7и) | **Крок162 виконано (конфіг + production-деплой):** noindex для не-production — `postbuild.mjs` за змінною `CONTEXT` (Netlify: production/deploy-preview/branch-deploy/dev) дописує секцію `/*` + `X-Robots-Tag: noindex` у `dist/_headers` (окрема секція — секції накладаються, як із ШІ-правилами). Локальні тести: deploy-preview/branch-deploy → noindex ✓, production/без CONTEXT → без ✓. Production-деплой `6aef46b3…` ready: на `koztechie.fyi`/`pp.ua` noindex ВІДСУТНІЙ ✓, `/poetry/` зберіг `noai, noimageai` ✓. Чек 7и: маркер noindex-логіки в postbuild (негативний тест → ❌/exit1). **Залишок:** тест deploy preview неможливий — git-інтеграції немає (repo: null); потрібно підключити репо в панелі Netlify (автор), тоді push → preview → `curl -I` має показати `x-robots-tag: noindex` |
| 2026-11-07 | 163 | — | **Крок163 виконано:** продакшн-збірка (команда `netlify.toml`: `npm ci --ignore-scripts && npm run build && npm run check`). Час: локально — npm ci 4.2 с + build 3.3 с + check 2.1 с ≈ **9.6 с** сумарно; на Netlify (деплой `6aef46b3…`) — `created 15:41:39` → `updated 15:41:54` ≈ **15 с** (upload + збірка + check). Попереджень: **0** у всіх гейтах — check 0/0, validate 0/0, size 0/0, Eleventy-лог без warnings, npm «found 0 vulnerabilities». Код не змінювався |
| 2026-11-07 | 164 | `docs/runbook.md`, `docs/deploy.md` (§7) | **Крок164 виконано:** `docs/runbook.md` — алгоритм при падінні: трьох-командний триаж (dig/curl/еталон netlify.app) → таблиця симптом→гілка → гілки A–E (DNS з еталоном зони NS/ALIAS/CNAME, HTTPS/сертифікат, контент/деплой, заголовки, повна недоступність Netlify) → відкат деплою покроково → обов'язкова верифікація (deploy.md §6) → таблиця ролей ШІ(MCP)/автор(панель) → швидка картка команд. Усі еталонні значення перевірено живими запитами; deploy.md §7 посилається на runbook |
| 2026-11-07 | 165 | `docs/recovery.md` | **Крок165 виконано:** `docs/recovery.md` — відновлення з нуля на один A4 (вхід: доступи/бекапи/інструменти → збірка → публікація Netlify+домен+DNS+HTTPS → верифікація → аварійні посилання). Обсяг: 1608 символів, 45 візуальних рядків (межа A4 при 12pt ≈ 42–45) ✓. **Ланцюжок відновлення перевірено фактично** (готує Браму5, крок168): чистий клон із GitHub → `npm ci && build && check` → «все чисто» за 8.7 с (30 файлів). Команди в документі — перевірені (dig/curl/еталони з кроків157–163) |
| 2026-11-07 | 166 | `docs/DECISIONS.md` §16.1 | **Крок166 (документ):** GSC — свідомий виняток з «нуля відстеження» зафіксовано в §16.1 чіткими межами: на сайті жодного артефакта GSC (верифікація — DNS TXT, не файл/метатег; `grep google-site-verification\|googletagmanager\|google-analytics dist/` → 0 ✓), GSC бачить лише TXT у зоні + запити краулерів до sitemap/сторінок (індексація ≠ аналітика), відвідувачі не передають нічого (DevTools → 0), мета — подати sitemap. Рядок у таблиці §16.1 та §17.2 уже були (синх не потрібен). **Ручний крок автора:** верифікація домену в GSC (DNS TXT — запис додасть ШІ через spaceship MCP після отримання значення) → Submit `https://koztechie.fyi/sitemap.xml` |
| 2026-11-07 | 167 | — | **Крок167 виконано — історія git чиста:** (1) `git log --all -- docs/red-lines.md docs/DEATH.md` → порожньо (приватні файли ніколи не комітилися); (2) 139 файлів, доданих за всю історію → 0 назв із приватними маркерами; (3) `ls-tree` по ВСІХ 195 ревізіях → 0 приватних шляхів; (4) пошук ключових слів (категорії AGENTS §7: діагноз/розлучення/похорон/весілля/борг/кредитор/лікування/дити/адреса/телефон/аналіз + red-lines/DEATH) — усі збіги пояснені: категорії заборон у AGENTS/DECISIONS/inventory, посилання на файли в docs, технічні терміни (Eleventy «child block», «аналіз тексту» у svitlogics), обіцянка приватності у contact; **жодного приватного факту**. Повторний скан перед наступною Брамою: ті самі 4 команди |
| 2026-11-07 | 168 | — | **БРАМА 5 ЗАКРИТО — усі 4 умови підтверджено свіжою перевіркою:** (1) сайт живий: `https://koztechie.fyi/` = HTTP/2 200, `server: Netlify`, h1 «Розробник і системний архітектор», паспорт «7 листопада 2026 року»; (2) редиректи: матриця 5/5 = 301 (pp.ua apex/www→fyi зі збереженням шляху, http→https, www.fyi→apex, Pretty URLs) + 4 правила `_redirects` на місці; (3) відновлення: чистий клон із GitHub → `npm ci && build && check` = «все чисто» за 8.7 с, HEAD клону збігається з репо; (4) історія чиста: 196 комітів, 0 приватних шляхів (`red-lines`/`DEATH` — 0) |
| 2026-11-09 | — | `static/fonts/` (8 woff2 + OFL), `src/styles/*`, `scripts/check.mjs`, `scripts/palette-check.mjs`, `AGENTS.md`, `docs/{design-system,DECISIONS,TECH_STANDARDS}.md` | **Перехід на дизайн-систему KZTCH_DS v1.1.0** (за рішенням автора: лише світла тема, повний набір шрифтів, токени в існуючі класи). Шрифти: Source Serif 4 + Inter Tight + IBM Plex Mono (8 woff2/332 КБ, OFL, `font-display: optional`) замість одного mono-сабсету. Палітра KZTCH: #ffffff/#f0f0f0/#000000/#595959 + teal #2ea7b5 та orange #fe7623 як ЗАЛИВКИ (чорний текст7,31/7,83:1 — самі акценти як текст не проходять AAA: 2,87/2,68:1); лінки чорні з underline2px, hover = фон surface, межі1→2px, фокус3px ink, заголовки Inter Tight800. Тема БУНКЕР вилучена (prefers-color-scheme → 0). Чеки оновлено: 7б (8 файлів/340 КБ), 7м (focus3px), palette (унікальні hex,9 пар KZTCH, без БУНКЕР). Канон синхронізовано: AGENTS §3/§4, DECISIONS §36.2/§39.1/§40/§41, TECH_STANDARDS §1/§4/§5/§6, design-system §1/§2/§4/§5/§8.2. Деплой `6af23109…` ready, live-верифікація: токени на місці, темної теми немає, шрифти200. Локальні тести: check/palette/validate = 0/0, візуальний огляд (скріншоти), fonts.check = true для всіх трьох |
| 2026-11-09 | — | `src/styles/{core,layout,components}.css`, `docs/design-system.md` | **Геометрія KZTCH_DS (2-й етап переходу — після вердикту автора «відповідність дуже низька»):** після перенесення токенів перенесено геометрію. Контейнер `--container:1200px` (main/шапка/футер) + текст `--measure:40rem` (640px, замість єдиної68ch-колонки); секції `padding:48px` / `64px ≥720px` (замість28px+margin40px); h1/h2 — `clamp(2.5→6rem / 1.75→2.75rem)`; навігація fs-md16px + `border-bottom2px` (активний = accent-лінія); hover лінків — **inverse** (`background:ink; color:bg`, як `.k-root a:hover` DS, замість surface); кнопка `.letter-cta` — чорна, ціль дотику44px, padding24px, hover inverse, active teal; футер — mono fs-sm + padding32px; skip-link — inverse; s-шкала відступів (4-96px) в `:root`. Верифікація computed styles: main1049px (вікно <1200), текст640px, h174px, секції64px, кнопка чорна48px. Канон: design-system §5.10/§6.4 → `40rem` |
| 2026-11-13 | — | `src/styles/{core,layout,components}.css`, `src/templates/base.njk`, `scripts/size-budget.mjs`, `docs/design-system.md` | **Повний візуальний прохід:** узгоджено desktop/mobile-ритм, reading column, реєстри, паспорт, навігацію, футер і focus; прибрано старий dark `theme-color`; CSS-токени тексту прив'язані до KZTCH_DS; бюджет шрифтів у `size-budget.mjs` синхронізовано з каноном 8/340 КБ. Перевірки: build/check/palette/validate/linkcheck/size — 0 помилок. |
| 2026-11-19 | 318 / P5 | `docs/PLAN.md`, `docs/runbook.md`, `docs/drills.md`, `scripts/live-probe.mjs` | **БРАМУ 10 не закрито:** `npm run build && npm run qa:all` і `npm run check:determinism` пройшли; live-probe виконав sitemap parity 30/30, OG AE=0, DNS MX/SPF/DMARC, a11y 34×7 і external links. Probe заблоковано: production `/.well-known/security.txt` = 404 (локальний файл є, потрібен deploy), Nu отримав HTTP 429 на 3/5 сторінок (додано retry), тому exit 1. AT 9/9, D-01…D-10 і тест смерті не підтверджені; PLAN 318 лишено `⏳`. |
| 2026-11-20 | T-9.3 / 318 | `docs/STATE.md`, `docs/PLAN.md`, `docs/drills.md`, `docs/recovery.md` | **БРАМА 10 лишається `⏳`; закриття не підтверджене.** AT 9/9 не має авторського запису. У реєстрі D-01…D-10 немає повного набору доказів виконання; D-16 описує лише локальну модель, D-21 зафіксований як заблокований Netlify routing. G-13 описаний у `recovery.md`, але фактичного zero-to-live прогону в поточному стані не зафіксовано. Існуючі D-11…D-20 не вважаються автоматично виконаними повторно під T-9.2 без відповідних записів/fixture. План 318 залишено `⏳`; закриття потребує реального AT-сеансу, відсутніх chaos-прогонів і задокументованого recovery-тесту. |
| 2026-11-19 | P5 release | `.github/workflows/deploy.yml`, `docs/STATE.md`, `content/{uk,en}/pages/now.md` | **Production виправлено й перевірено:** PR #10 з `include-hidden-files: true` злитий (`83b98bd`), deploy #44492478160 green; `security.txt` = 200, G-01 MX/SPF/DMARC/Contact pass, HSTS без `preload`. Незалежний `npm run live-probe` pass: sitemap/publicPages 30/30, OG AE=0, production a11y 34×7, external links pass. **БРАМА 10 лишається `⏳`:** AT 9/9, D-01…D-10 і zero-to-live recovery не виконані. |
| 2026-11-19 | T-0.1 | `docs/STATE.md` | Гілка `hardening/antifragile-2026-11`, база `29ee80e`. Baseline: `npm ci --ignore-scripts` — 0 vulnerabilities; `npm run build`, `npm run qa:all` — усі гейти 0 помилок / 0 попереджень; `npm run check:determinism` — два послідовні `dist` ідентичні. Останній готовий production deploy на момент зняття baseline: `6aff16a0164640cedf7e68d0` (`ready`). У Netlify CLI 27.13.0 команда `deploy:list --json` відсутня; id зчитано через `netlify api listSiteDeploys`. |
| 2026-11-19 | T-1.1 / D-11 | `docs/runbook.md`, `docs/drills.md`, `docs/STATE.md` | Виправлено rollback на `listSiteDeploys` + `restoreSiteDeploy` (CLI 27.13.0 не має `deploy:list` / `deploy:restore`). Прогін на draft `6aff1988ddaa5bad08db6130` підтвердив, що production лишився на попередньому deploy. D-11: на throwaway-гілці вилучено `X-Frame-Options`, production deploy `6aff1abc5bb5826b496bfce8`, потім саме командою runbook відновлено `6aff16a0164640cedf7e68d0`; усі перевірені заголовки повернулися. Throwaway-гілку видалено. Ручний дрил PASS. |
| 2026-11-19 | T-1.3 / D-12 | `scripts/check-runbook-commands.mjs`, `scripts/qa-all.mjs`, `docs/drills.md`, `docs/STATE.md` | Додано гейт для Netlify CLI-команд у fenced bash-блоках `docs/runbook.md` і `docs/recovery.md`; команда зі списку CLI 27.13.0 дозволена, невідома відхиляється. D-12: ін’єкція `netlify deploy:restore` завершила гейт кодом 1; ін’єкцію вилучено. |
| 2026-11-19 | T-1.2 / З-10 | `docs/runbook.md`, `docs/recovery.md`, `docs/STATE.md` | Runbook і recovery узгоджено з Netlify DNS `dns*.p07.nsone.net`; прибрано Spaceship NS та фіксовані A-IP як еталони. Тріаж і відновлення перевіряють кожну A-відповідь через `curl --resolve` та HTTP 200. Live-перевірка: 4 NS від `p07.nsone.net`, кожна поточна A-адреса через `--resolve` → 200, звичайний запит → 200. |
| 2026-11-19 | T-2.2 / D-14 | `.github/workflows/deploy.yml`, `scripts/live-probe-light.mjs`, `scripts/rollback-production.mjs`, `docs/runbook.md`, `docs/drills.md` | Додано post-deploy smoke та rollback після помилки: JSON deploy ID → `listSiteDeploys` → попередній ready production → `restoreSiteDeploy` → повторний smoke. D-14 на throwaway-гілці прибрав CSP із production payload: `6aff2ac9914fefa5e86157a7`; smoke упав на CSP, helper відновив `6aff26050731eec078e893e0`, повторний smoke пройшов. CSP і X-Frame-Options підтверджено на production. |
| 2026-11-19 | T-2.1 / D-13 | `scripts/tools/package.json`, `scripts/tools/package-lock.json`, `.github/workflows/deploy.yml`, `scripts/check-deploy-pin.mjs`, `docs/drills.md` | Netlify CLI закріплено на 27.20.0 у tools lockfile; production job встановлює locked tools і запускає `npx --prefix scripts/tools netlify deploy`. G-16 перевіряє точний pin у manifest/lockfile та виклик через prefix. D-13: тимчасове вилучення залежності завершило gate кодом 1; manifest відновлено. |
| 2026-11-19 | T-3.3 / D-15 | `docs/reference/`, `test-references/`, `.github/workflows/qa.yml`, `docs/environment.md`, `docs/runbook.md`, `docs/drills.md` | References переведено на `ubuntu-24.04` runner `ubuntu24/20261111.370`: ImageMagick `8:6.9.12.98+dfsg1-5.2build2`, librsvg `2.58.0+dfsg-1ubuntu0.1`, fontconfig `2.15.0-1.1ubuntu2`, freetype `2.13.2+dfsg-1ubuntu0.2`, Playwright `1.65.1` / Chromium `159.0.8154.6`. Run `44583333266`: determinism pass, favicon + 15 OG `AE=0`, reflow 9/9 без diff; static і measured-quality green. D-15 stale-reference injection: run `44584973242` відхилив старий OG (`AE=32954`), тоді як measured-quality пройшов. Еталон відновлено в `c640d06`; фінальний run `44587135774`: static і measured-quality green. |
| 2026-11-19 | T-4.1 / D-16 | `.github/workflows/deploy.yml`, `scripts/live-probe-light.mjs`, `scripts/live-probe.mjs`, `docs/DECISIONS.md`, `docs/drills.md` | До production deploy додано збереження fingerprint CSS із попереднього production HTML у `dist/styles/`. Список URL передається у post-deploy light probe; кожен попередній fingerprint має повертати HTTP 200. D-16 локально підтвердив HTTP 404 без файла → HTTP 200 після preservation, а probe відхиляє 404 і приймає 200. Фактичний production deploy/acceptance ще не виконано. |
| 2026-11-19 | T-4.2 / D-17 | `scripts/active-css.mjs`, `scripts/size-budget.mjs`, `scripts/check.mjs`, `docs/DECISIONS.md`, `docs/drills.md` | Page/core CSS weight рахується лише для активних fingerprint CSS URL-ів із `dist/index.html`; fallback — найновіші site/print файли. Глобальний retention-ліміт на 3 пари залишається. D-17 у тимчасовій копії тричі згенерував різні fingerprints через `bundle-styles.mjs`; `size-budget` і `check` пройшли для 3 пар, рахуючи активні 6.3 КіБ. |
| 2026-11-19 | T-4.3 / D-18 | `.eleventyignore`, `scripts/check-dist-inventory.mjs`, `scripts/qa-all.mjs`, `docs/DECISIONS.md`, `docs/drills.md` | Додано inventory allowlist для `dist/` як G-17 та підключено до єдиного QA. `.eleventyignore` виключає локальні конфіги, fixtures і root Markdown. D-18: `dist/leak.txt` відхилено кодом 1; тимчасовий root `.md` не потрапив до збірки; чистий `dist/` (80 файлів) пройшов. |
| 2026-11-19 | T-5.1 / D-19 | `content/{uk,en}/pages/nichlyst.md`, `static/nichlyst/first-knock-{450,700}.webp`, `scripts/check.mjs`, `docs/TECH_STANDARDS.md`, `docs/DECISIONS.md`, `docs/drills.md` | Перший кадр NICHLYST переведено на eager/high priority та 450w/700w/900w srcset; інші кадри лишено lazy. cwebp variants: 450w 14 462 Б, 700w 16 282 Б. Mobile DPR 2 обирає 700w. G-19 перевіряє контракт; D-19 відхилив lazy-ін’єкцію. Lighthouse desktop LCP 764 мс, mobile 834 мс; production acceptance pending. |
| 2026-11-19 | T-6.1 / D-20 | `scripts/postbuild.mjs`, `scripts/live-probe-light.mjs`, `scripts/live-probe.mjs`, `docs/DECISIONS.md`, `docs/drills.md` | Postbuild генерує forced directory-index 301 для всіх непорожніх каталогів та прямі forced 404 status rules. Точні правила перед `/en/*` fallback. Local Netlify: `/blog/index.html` → 301 `/blog/`, `/en/index.html` → 301 `/en/`, прямі 404 сторінки — HTTP 404. D-20 підтвердив 200 для `/blog/index.html` при вимкненій генерації і провал light-probe. Production acceptance pending. |
| 2026-11-19 | T-6.2 / D-21 | `static/root/_redirects`, `scripts/check.mjs`, `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/drills.md` | Додано forced HTTP/HTTPS www.fyi → HTTPS apex і HTTP apex → HTTPS apex. Deploy `6aff53adcc9404b36d1c0f98`; Netlify нормалізує HTTP www → HTTPS www → HTTPS apex, тобто 2 хопи до `_redirects`. Тимчасове вимкнення `force_ssl` та явний www alias не змінили результат; налаштування відновлено (`force_ssl=true`, alias — pp.ua). Light live-probe пройшов; one-hop acceptance blocked платформним routing. |
| 2026-11-19 | T-6.4 / Z-17 | `src/sitemap.njk`, `scripts/check.mjs`, `scripts/live-probe.mjs`, `docs/DECISIONS.md` | Sitemap отримав `x-default` на український URL для кожної сторінки з доступною uk-версією. Локальний gate та production probe порівнюють повні набори alternate із HTML; `npm run build` і `npm run qa:all` пройшли. Deploy `6aff587aea829f84110d5c18`; production sitemap містить 32 x-default. Live-probe підтвердив 32 URL parity та не виявив hreflang-помилок; повний процес завершився кодом 1 через вісім G-11 OG AE розбіжностей та strict linkcheck на навмисний `/404.html` статус 404. |
| 2026-11-20 | T-7.1 / D-01-ext | `scripts/email-dns-gate.mjs`, `scripts/drill-email-dns-gate.mjs`, `scripts/qa-all.mjs`, `package.json`, `docs/drills.md` | G-01 вимагає DKIM TXT для selector `EMAIL_DKIM_SELECTOR` (типово `zmail`). In-memory fixture без DKIM відхилено тим самим gate; fixture-тест додано до `qa:all`. Живий G-01 пройшов для koztechie.fyi: MX, SPF, DKIM zmail, DMARC і security.txt Contact. |
| 2026-11-20 | T-7.2 / Z-09 | Netlify DNS zone `koztechie.pp.ua` (`69fd6a22b029fdf7556ab53f`), `docs/infra-email.md`, `docs/DECISIONS.md`, `docs/recovery.md` | Перед зміною експортовано всі 6 записів зони в `/mnt/data/koztechie-pp-ua-dns-zone-2026-11-20.json` (права 0600, поза git). Додано `_dmarc.koztechie.pp.ua TXT "v=DMARC1; p=reject; rua=mailto:hello@koztechie.fyi"`; замінено SPF ImprovMX на `v=spf1 -all`, MX ImprovMX залишено. Перевірено `dig NS` (p04), TXT DMARC (`p=reject`) та SPF (`-all`). |
| 2026-11-20 | T-7.3 / Z-19 | Netlify DNS zone `koztechie.fyi` (`6af06223dbb8325f043b58f0`), `docs/infra-email.md` | Перед зміною експортовано всі 10 записів у `/mnt/data/koztechie-fyi-dns-zone-2026-11-20-t73.json` (0600, поза git). Додано обидва CAA `issue`/`issuewild` для letsencrypt.org; `dig CAA` підтвердив обидва. Поточний `zmail` DKIM — 1024-бітний, G-01 проходить. Перегенерація DKIM заблокована: Zoho Admin показує форму входу, активної авторизованої сесії немає; ключ не змінювався. |
| 2026-11-19 | T-6.3 / D-22 | `static/root/_redirects`, `scripts/check.mjs`, `scripts/live-probe-light.mjs`, `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/runbook.md`, `docs/drills.md` | Обрано єдиний canonical host: forced 301 для `https://koztechie.netlify.app/*` на `.fyi`, правило стоїть перед path redirects. Netlify URL більше не діагностичне дзеркало; runbook спирається на `curl --resolve` для перевірки DNS-незалежного endpoint. Корінь, `/en/` і вкладений URL із query перевірено production probe-ом за один хоп. |
| 2026-11-20 | T-9.4 | `.github/workflows/deploy.yml`, `scripts/live-probe.mjs`, `scripts/external-linkcheck.mjs` | Виправлено хибні deploy-блокери: production OG перевіряється на HTTP 200 та PNG 1200×630 замість піксельного порівняння з локальним reference; W3C Nu 429 і зовнішні link-помилки є advisory; live a11y матриця працює на зібраному `dist`; production crawler більше не завантажує очікувані 404 documents. У workflow тієї версії статична QA лишалася обов’язковою, Lighthouse/a11y/reflow/Pa11y були advisory і не блокували deploy. Build, `qa:all`, determinism, full live-probe пройшли; post-deploy light smoke та G-01 пройшли. Production deploy `6affef3f2cfa308eae0a9d48` — ready. |
| 2026-11-21 | 4.8 / status reconciliation | `docs/PLAN.md`, `docs/STATE.md`, `docs/drills.md` | Локально пройшли `build`, `qa:all`, `plan-lint`, `check:determinism`, `git diff --check`. GitHub run [44824303294](https://github.com/koztechie/koztechie-fyi/actions/runs/44824303294), SHA `21224f6`: Static QA, production deploy, post-deploy smoke і G-01 — success; D-16 перевірено production probe-ом: попередні CSS fingerprints = HTTP 200. Той самий run: Lighthouse desktop/mobile і a11y matrix завершилися success, але advisory Reflow matrix — failure; не позначати всі вимірювання зеленими. Наступний Netlify production deploy `6b0152554c08238358db1d8f` ready; live `/` і `/.well-known/security.txt` = 200, HSTS присутній. Deploy-preview `6aff1988ddaa5bad08db6130` = HTTP 200 + `X-Robots-Tag: noindex` (PLAN 162 підтверджено). GitHub repo — public; відкритих issues — 0. Гейт 6 лишився відкритим через непідтверджений анонс; 7–9 — через незавершені кроки та Reflow; брама 10 лишається `⏳` через AT, chaos-drills, D-21 і G-13/recovery. PLAN 166 повернуто в `⏳`: подання sitemap у GSC не має авторського підтвердження. |
| 2026-11-20 | D-08 / Phase 0 exit | `docs/drills.md`, `.github/workflows/deploy.yml`, `scripts/reflow-check.mjs` | D-08 PASS: у throwaway PR #19 тимчасово сховано focus outline (`outline: none`). Static QA відхилив зміну, production run `44786302480` пропустив `Measured quality gate` і `Deploy production`; PR required `Measured quality budgets` — failure, PR закрито без merge, гілку видалено. Production SHA лишився рівним `main HEAD` (`d0e8c8f…`). Phase 0 exit підтверджено після виправлення reflow, що раніше мутував `dist` під час measured checks; production deploy run `44777689067` пройшов static + measured + smoke. |
| 2026-11-21 | R3.0 / локальний QA | `docs/design-system.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/testing.md`, `docs/PLAN.md`, шаблони й валідатор | Після збірки та `qa:all` пройшла axe-матриця 38 сторінок × 7 режимів; усі 38 HTML перевірено на 320/768/1440px (114 комбінацій), без overflow і без відхилень h1. Mobile Lighthouse виконав 9 прогонів на Playwright Chromium 159: error-гейти LCP ≤1434 мс, CLS=0, TBT≤564 мс, a11y=1 і SEO=1 пройшли; performance головної — 0.85–0.93 за warning-порогом 0.95. Системний Google Chrome локально падає в crashpad; тест завершено штатним Chromium Playwright. `check:determinism` (два ідентичні build), `plan-lint` і `git diff --check` пройшли. Screenshot baseline не оновлено; після R3.1 reflow працює в advisory-режимі й diff не блокує CI чи deploy. Ручний AT-аудит лишається незавершеним, але не є release gate. PLAN 271, 272 і 274 позначено виконаними; `/now/` uk/en оновлено по суті статусу проєкту. |
