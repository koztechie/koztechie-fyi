# RUNBOOK: алгоритм при падінні (PLAN 164)

**Мета:** за ≤ 5 хв визначити причину й усунути. Порядок — від найчастішого
до рідкісного. Кожна гілка завершується **верифікацією** (розділ «Після будь-якої дії»).

**Джерела:** `docs/deploy.md` (§6 верифікація, §7 відкат, §8 старий сервер),
`docs/ARCHITECTURE.md` §9 (`netlify.toml`, `_headers`, `_redirects`).

---

## −1. Обов'язковий a11y-гейт перед релізом

Цей протокол проходить **до кожного production-релізу** після `build` і
`check`. Непройдений або непройдений пункт блокує публікацію. Зафіксуй дату,
браузер, ОС, сторінки та результат у релізному записі. Не позначай пункт
зеленим за припущенням.

## −0. Weekly production probe

GitHub Actions запускає existing cron щопонеділка без production deploy:

```bash
npm run build
npm run live-probe
```

`live-probe.mjs` перевіряє sitemap-сторінки, special paths і заголовки, після
чого запускає `a11y-matrix.mjs` проти `https://koztechie.fyi`. Матриця бере
URL із production sitemap і додає `/404.html` та локально згенеровані stubs,
щоб перевірити їхній production-відповідник. Playwright bypass CSP діє лише в
тестовому контексті; сам production CSP перевіряється окремим header-гейтом.

Далі probe запускає production-aware external linkcheck у strict-режимі:

```bash
LINKCHECK_ORIGIN=https://koztechie.fyi node scripts/external-linkcheck.mjs --strict
```

У probe `LINKCHECK_ORIGIN` вказує на production origin. Перевірка читає HTML
із sitemap, `/404.html` і stubs, тому CDN-відповідь та зовнішні посилання
перевіряються без використання локального `dist` як джерела сторінок. Probe
не виконує `netlify deploy`, не змінює baseline і не оновлює контент.

### Клавіатура

- [ ] На `home`, `nichlyst`, `colophon`, `poem`, `blog` натиснути `Tab` від
  початку до кінця документа: фокус рухається в логічному порядку, кожна ціль
  досяжна один раз.
- [ ] Пройти той самий цикл через `Shift+Tab`: порядок зворотний, фокус не
  зникає й не потрапляє за межі viewport.
- [ ] Перший `Tab` фокусується на skip-link; `Enter` переводить фокус на
  `<main id="main" tabindex="-1">`; наступний `Tab` іде в перший елемент
  контенту.
- [ ] Перевірити видиме кільце фокуса на skip-link, навігації, перемикачі
  мови, посиланнях архіву, пагінації, таблиці, `pre` і футері.
- [ ] На тач-емуляції не залишається залиплого hover-стану; `:active` не
  змінює ширину тексту.

### Скринрідери

- [ ] **NVDA + Firefox:** пройти заголовки (`H`), лендмарки/регіони
  (`D`/landmarks), таблиці (`T`) і попередження `role="note"` на кожній із
  п'яти контрольних сторінок.
- [ ] **VoiceOver + Safari:** повторити обхід заголовків, лендмарків,
  таблиць і попереджень; перевірити, що декоративні `·` та тире не створюють
  зайвих озвучених вузлів.
- [ ] Таблиця колофона оголошується таблицею, її заголовки зчитуються, а
  горизонтальний скрол доступний із клавіатури.
- [ ] `pre` оголошується як окрема фокусована область; текст коду не
  дублюється.

### Масштаб і системні режими

- [ ] За `200%` zoom перевірити ті самі п'ять сторінок: немає обрізаного
  тексту, горизонтального скролу сторінки чи втрати контенту; таблиці
  скроляться локально.
- [ ] Увімкнути **Windows High Contrast / forced-colors**: текст, межі,
  посилання й кільце фокуса залишаються видимими; інформація не передається
  лише кольором.
- [ ] Увімкнути `prefers-contrast: more`: текст, межі та фокус мають
  достатній контраст, layout не ламається.
- [ ] Увімкнути `prefers-reduced-motion`: немає помітних анімацій або плавного
  прокручування.

### Запис гейта

```text
Дата/реліз:
Сторінки:
NVDA + Firefox:
VoiceOver + Safari:
200% zoom:
forced-colors:
prefers-contrast:
prefers-reduced-motion:
Результат: PASS / BLOCKED
Незакриті дефекти:
```

**Правило публікації:** спочатку закрий усі пункти або запиши блокер і не
публікуй production. Цей гейт доповнює автоматичні `npm run check`, `npm run
size` і зовнішню перевірку посилань; автоматичні перевірки не замінюють
NVDA/VoiceOver.

---

## 0. Кеш рідкозмінних ресурсів

`/nichlyst/*` і favicon-іконки кешуються на 7 днів. Fingerprinted CSS
оновлюється новим URL автоматично, але іконки мають стабільні імена.

Якщо змінюються favicon, `apple-touch-icon.png` або токени, що впливають на
зображення NICHLYST, перед релізом виконай ручний purge CDN/Netlify або
перейменуй ресурс і всі посилання на нього. Не покладайся на старий кеш після
візуальної зміни. Після деплою перевір `Cache-Control` через live-probe.

---

## 0а. Reflow references і tolerance

Reflow є вторинним візуальним гейтом після a11y-матриці. `scripts/reflow-check.mjs`
порівнює PNG через ImageMagick `compare -fuzz 2% -metric AE`. Допускається до
`0,1%` пікселів; перевищення блокує перевірку. Для кожної відмінності створюється
`qa-artifacts/reflow/*-diff.png`, який CI завантажує як artifact при падінні.

Після навмисної зміни layout або стилів онови baseline в такому порядку:

```bash
npm run build
python3 -m http.server 4173 --directory dist &
UPDATE_SCREENSHOTS=1 node scripts/reflow-check.mjs
git add test-references
git commit -m "test: re-baseline screenshots"
node scripts/reflow-check.mjs
```

Не використовуй `UPDATE_SCREENSHOTS=1` для звичайної перевірки: він замінює
references поточними знімками. Перед commit переглянь усі зміни в
`test-references/`; фінальний запуск виконуй без прапорця.

---

## 0б. Оновлення locked QA tools

Щомісячний workflow `Dependency cadence` запускає `npm outdated` тільки в
`scripts/tools`. Dependabot має дозвіл створювати npm PR лише для
`/scripts/tools`, а окреме правило — лише для GitHub Actions. Root
`package.json` не є ціллю оновлень: у ньому лишається одна exact-залежність
`@11ty/eleventy`.

Оновлюй тільки інструменти в `scripts/tools/`; root `package.json` і root
lockfile не змінюй. Перед bump зафіксуй причину й цільову версію в зміні.
Порядок не переставляй:

```bash
cd scripts/tools
npm install --save-exact playwright@<version> axe-core@<version> \
  @lhci/cli@<version> html-validate@<version> pa11y-ci@<version>
npm ci --ignore-scripts
npx playwright install --with-deps chromium
cd ../..

npm run build
npm run check
python3 -m http.server 4173 --directory dist &
A11Y_MATRIX_USE_EXISTING_SERVER=1 node scripts/a11y-matrix.mjs
UPDATE_SCREENSHOTS=1 node scripts/reflow-check.mjs
git add scripts/tools/package.json scripts/tools/package-lock.json test-references
git commit -m "qa: bump locked accessibility tools"
node scripts/reflow-check.mjs
```

Після push дочекайся CI: a11y-матриця має пройти до reflow, а mobile і desktop
Lighthouse мають завершитися успішно. Не видаляй старий lockfile, не запускай
`npm update` без explicit версій і не коміть `node_modules/`.

---

## 0в. Determinism epoch

У CI `SOURCE_DATE_EPOCH` дорівнює Unix timestamp останнього commit:

```bash
export SOURCE_DATE_EPOCH="$(git log -1 --pretty=%ct)"
npm run check:determinism
```

Не підставляй поточний час і не фіксуй epoch вручну в source-файлах. Це робить
build повторюваним для одного commit і змінює build date лише разом із commit.
Після зміни lockfile, content, templates або build-скриптів повтори
`check:determinism` у чистому робочому дереві.

---

## 0г. Deploy path

Перед production deploy збирай із **кореня репозиторію**, а публікуй `dist/`:

```bash
npm ci --ignore-scripts
npm run build
npm run check
netlify deploy --prod --dir=dist
```

Корінь потрібен для `netlify.toml`, `package.json`, lockfile та build command.
`dist/` — результат збірки, а не source tree: у ньому немає `package.json`,
тому запуск Netlify build із `dist` зламає `npm ci`. Не деплой `dist` як
кореневий build directory; передавай його лише як publish/deploy directory.

---

## 0. Триаж — три команди (3 хвилини)

```bash
# 1. Резолвиться чи ні?
dig +short A koztechie.fyi
# 2. Що відповідає?
curl -sI -m 10 https://koztechie.fyi/ | head -3
# 3. Живий узагалі? (еталон — той самий сайт на netlify.app)
curl -sI -m 10 https://koztechie.netlify.app/ | head -3
```

| Симптом | Гілка |
|---|---|
| `dig` порожній або старі IP (`34.216…`/`54.149…`) | **A. DNS** |
| `dig` дає Netlify (`75.2.60.5`/`99.83.231.61`), але `curl` — помилка з'єднання/сертифіката | **B. HTTPS** |
| `netlify.app` працює, а `.fyi` — 404 або не той контент | **C. Контент/деплой** |
| Обидва лежать (netlify.app теж) | **E. Netlify** |
| Сайт відповідає, але впали заголовки (нема CSP/HSTS/`noai`) | **D. Заголовки** |

---

## A. DNS: не резолвиться або старі IP

**Еталон (не чіпати):** NS `launch1/launch2.spaceship.net`; apex **ALIAS →
`apex-loadbalancer.netlify.com`**; `www` **CNAME → `koztechie.netlify.app`**.

1. Авторитетна перевірка (міністово, без локального кешу):
   ```bash
   dig @launch1.spaceship.net koztechie.fyi A +short   # → 75.2.60.5 / 99.83.231.61
   dig @launch1.spaceship.net www.koztechie.fyi +short  # → koztechie.netlify.app.
   ```
2. Якщо відповіді немає або старі IP — перезаписати зону (інструмент ШІ
   `spaceship.dns_records_save` або панель Spaceship → DNS → запис:
   - `@` **ALIAS** → `apex-loadbalancer.netlify.com`
   - `www` **CNAME** → `koztechie.netlify.app`
3. **Заборонено:** змінювати NS (мають лишатися launch1/launch2).
4. Полінг: `dig` повторювати до появи Netlify IP (зазвичай ≤ 5 хв).
5. Далі — розділ «Після будь-якої дії».

**Довідка для відкату DNS:** старий openresty-сервер — `34.216.117.25`,
`54.149.79.189` (`deploy.md` §8; він уже вимкнений автором — на нього не
розраховувати, лише не переплутати під час діагностики).

---

## B. HTTPS: DNS ок, але сертифікат/з'єднання

1. Хто відповідає: `curl -sI http://koztechie.fyi/` → має бути
   `301 Location: https://koztechie.fyi/` від `Server: Netlify`.
   Якщо `Server: openresty` — див. гілку A (DNS дивиться не туди).
2. Статус сертифіката: панель Netlify → проєкт `koztechie` → Domain
   management → `koztechie.fyi` → статус сертифіката. Після зміни DNS
   Let's Encrypt видає до ~10 хв (перевірено 2026-11-07), повний цикл — до 24 год.
3. Force HTTPS має бути увімкнений (Domain management → HTTPS).
4. Полінг:
   ```bash
   for i in $(seq 1 20); do curl -sI -m 8 https://koztechie.fyi/ | head -1 && break; sleep 30; done
   ```
5. Далі — «Після будь-якої дії».

---

## C. Контент не той / 404 на всьому / старий деплой

1. Порівняти еталон і живе:
   ```bash
   grep -o "<h1[^>]*>[^<]*</h1>" dist/index.html   # локальний еталон
   curl -s https://koztechie.fyi/ | grep -o "<h1[^>]*>[^<]*</h1>"   # живе
   ```
2. Стан деплоїв: панель Netlify → Deploys (або ШІ:
   `netlify-deploy-services-reader.get-deploy`).
3. **Відкат** — розділ «Відкат деплою» нижче.
4. Якщо відкату нема з чого — свіжий деплой: ШІ через MCP
   `deploy-site` з `deployDirectory` = **корінь репо** (не `dist`! — у `dist`
   немає `package.json`, збірка впаде), або локально:
   `npm ci --ignore-scripts && npm run build && npm run check` → панель
   Netlify → Deploys → Drag and drop (`dist/`).

---

## D. Заголовки впали (нема CSP/HSTS/`noai`)

1. Діагностика:
   ```bash
   curl -sI https://koztechie.fyi/ | grep -iE "content-security|strict-transport"
   curl -sI https://koztechie.fyi/poetry/ | grep -i x-robots-tag   # → noai, noimageai
   ```
2. Локальне джерело — `static/root/_headers` (канон: `ARCHITECTURE` §9):
   секція `/*` (безпека, крок160) + чотири ШІ-секції (крок122).
   Перевірка: `npm run check` (розділ 7и).
3. Якщо файл цілий, а live пустий — деплой не застосував `_headers`:
   див. лог деплою, «header rules processed» має бути **5**.
4. Далі — «Після будь-якої дії».

---

## E. Повна недоступність (лежить сам Netlify)

1. Статус: <https://www.netlifystatus.com/> (історія інцидентів).
2. Панель Netlify → Deploys: чи є `ready`-деплой (якщо панель теж недоступна —
   чекати status page, рішень нема).
3. Резервний вузол: `koztechie.netlify.app` — якщо він живий, а `.fyi` ні →
   це не Netlify, а DNS/домен (гілка A/B).
4. Після завершення інциденту — «Після будь-якої дії».

---

## Відкат деплою (крок за кроком)

1. Панель Netlify → проєкт `koztechie` → **Deploys** → список «Published deploys».
2. Знайти останній **відомий добрий** (за датою та заголовком логу —
   наприклад, з «N generated pages»).
3. Відкрити його → **Publish deploy** → підтвердити.
4. Перевірити (розділ «Після будь-якої дії»).
5. **Заборонено** видаляти погані деплої до повної верифікації — вони
   потрібні як доказ для діагностики.

---

## Після будь-якої дії (обов'язкова верифікація)

Повний чек-лист із очікуваними відповідями: **`docs/deploy.md` §6**.
Мінімум — три команди:

```bash
dig +short A koztechie.fyi                                # → 75.2.60.5 / 99.83.231.61
curl -sI https://koztechie.fyi/ | head -1                 # → HTTP/2 200
curl -s https://koztechie.fyi/ | grep -o "<h1[^>]*>[^<]*</h1>"  # → актуальний h1
```

Плюс браузерний обхід (`environment.md §4`): головна, мовний перемикач,
`/blog/`, `/poetry/`, 404.

---

## Ролі: що робить ШІ, що — автор

| Дія | Виконавець |
|---|---|
| Деплой (`deploy-site` MCP, корінь репо), читання деплоїв/логів | **ШІ** |
| DNS-записи Spaceship (`dns_records_save`) | **ШІ** |
| Діагностика (`dig`/`curl`), локальний build/check | **ШІ** |
| Панель Netlify: відкат деплою (Publish), Domain management, Force HTTPS, підключення git-репо | **Автор** |
| Зміна NS, оплата/продовження домену | **Автор** |
| Вимкнення старого AWS-сервера | **Автор** (`deploy.md` §8) |

---

## Швидка картка (копіювати)

```bash
dig @launch1.spaceship.net koztechie.fyi A +short      # DNS-еталон
dig +short A koztechie.fyi                             # локальний кеш
curl -sI https://koztechie.fyi/ | head -3              # живий?
curl -sI https://koztechie.netlify.app/ | head -3      # еталон Netlify
curl -sI https://koztechie.fyi/poetry/ | grep -i x-robots-tag   # ШІ-правило
npm run check                                           # локальні гейти (0/0)
```

**Порядок дій:** триаж → гілка (A–E) → дія → «Після будь-якої дії» →
записати інцидент у `docs/STATE.md` (дата, симптом, причина, що виправлено).
