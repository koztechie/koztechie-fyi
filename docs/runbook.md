# RUNBOOK: алгоритм при падінні (PLAN 164)

**Мета:** за ≤ 5 хв визначити причину й усунути. Порядок — від найчастішого
до рідкісного. Кожна гілка завершується **верифікацією** (розділ «Після будь-якої дії»).

**Джерела:** `docs/deploy.md` (§6 верифікація, §7 відкат, §8 старий сервер),
`docs/ARCHITECTURE.md` §9 (`netlify.toml`, `_headers`, `_redirects`).

---

## −1. Ручний accessibility-аудит (не релізний гейт)

Цей протокол допомагає окремо перевіряти роботу з клавіатурою, скринрідерами,
масштабом і системними режимами. Непройдені або недоступні ручні перевірки
**не блокують production deploy** і не позначаються як виконані. Для релізу
обов'язкові статичні й вимірювальні перевірки з
`.github/workflows/deploy.yml`: accessibility-матриця, Lighthouse, Pa11y/axe,
HTML validation та перевірка цілісності build-артефакту. Фіксуй ручні
результати тут, коли аудит фактично відбувся.

## −0. Production probes

GitHub Actions запускає existing cron щопонеділка без production deploy:

```bash
npm run build
npm run live-probe
```

`live-probe.mjs` перевіряє sitemap-сторінки, special paths і заголовки, після
чого запускає `a11y-matrix.mjs` проти `https://koztechie.fyi`. Матриця бере
URL із production sitemap і додає `/404.html`, `/en/404.html` та всі локально
згенеровані noindex stubs,
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

Повний понеділковий probe додатково виконує W3C Nu-перевірку п’яти
production-сторінок через `validator.w3.org/nu/?doc=<url>&out=json`. HTTP 429
повторюється до двох разів із `Retry-After` або зростаючою паузою; якщо сервіс
і далі недоступний, Nu залишається advisory, а тіло вже отриманого production
HTML перевіряється локальним `html-validate`. Недоступність Nu не маскує
помилки локальної перевірки. Якщо Nu доступний, його повідомлення `type: error`
залишаються помилкою probe.

Щоб перевірити fallback без навмисного навантаження на зовнішній валідатор:

```bash
LIVE_PROBE_NU_SIMULATE_429=1 npm run live-probe
```

Очікуваний результат — три simulated 429 на кожній із п’яти сторінок,
п’ять успішних `html-validate` перевірок і загальний успіх probe.

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

### Запис ручного аудиту

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

**Правило публікації:** ручний аудит ведеться окремо від релізу. Залишай
недоступні перевірки позначеними `BLOCKED`/`PARTIAL`; не підміняй ними
автоматичні гейти й не заявляй повну відповідність WCAG. Якщо аудит виявить
конкретний дефект, зареєструй і виправ його. Відсутність фізичного пристрою чи
assistive technology сама по собі не затримує production deploy.

### P5 — статус закриття БРАМИ 10

Цей перелік визначає лише формальний вихід із Фази C, а не дозвіл на production
deploy. Не називай БРАМУ 10 закритою, доки не виконано обидва докази:

1. D-01…D-10 на throwaway-гілці з ненульовим результатом відповідного gate;
2. відновлення з нуля за `docs/recovery.md` із фактичним Netlify DNS.

Автоматичні build, QA, determinism і live-probe фіксуй окремо. Їхній зелений
результат не перетворює ручні `BLOCKED` на `PASS`; незавершений ручний AT-аудит
не є умовою production deploy або виходу з Фази C.

---

## 0. Кеш рідкозмінних ресурсів

`/nichlyst/*` і favicon-іконки кешуються на 7 днів. Fingerprinted CSS
оновлюється новим URL автоматично, але іконки мають стабільні імена.

Якщо змінюються favicon, `apple-touch-icon.png` або токени, що впливають на
зображення NICHLYST, перед релізом виконай ручний purge CDN/Netlify або
перейменуй ресурс і всі посилання на нього. Не покладайся на старий кеш після
візуальної зміни. Після деплою перевір `Cache-Control` через live-probe.

---

## 0а. Reflow references і tolerance (інформаційний звіт)

Reflow — інформаційний screenshot-звіт, а не релізний гейт. У CI
`REFLOW_ADVISORY=1` зберігає знімки й diff-artifacts, але відмінності від
reference не провалюють перевірку чи production deploy. Помилки запуску
браузера/інструментів лишаються помилками. Локальний запуск без прапорця
зберігає строгий режим для діагностики. Порівняння використовує ImageMagick
`compare -fuzz 2% -metric AE` з порогом `0,1%` пікселів.

Канонічне середовище references — GitHub Actions `ubuntu-24.04`; fontconfig,
freetype та raster-бібліотеки впливають на пікселі. Оновлення reference після
навмисної зміни дизайну — необов'язкова робота для чистоти звіту, не передумова
релізу.

Якщо потрібен чистий screenshot baseline після навмисної зміни layout або
стилів, онови його на `ubuntu-24.04` runner:

```bash
npm run build
python3 -m http.server 4173 --directory dist &
UPDATE_SCREENSHOTS=1 node scripts/reflow-check.mjs
git add test-references
git commit -m "test: re-baseline screenshots"
REFLOW_ADVISORY=1 node scripts/reflow-check.mjs
```

Не використовуй `UPDATE_SCREENSHOTS=1` для звичайної перевірки: він замінює
references поточними знімками. Перед commit переглянь усі зміни в
`test-references/` і `docs/reference/`; фінальний advisory-запуск виконуй без
прапорця. Після міграції runner-а перенось лише CI-знімки з цільової ОС:
OG — `dist/og/`, favicon — raster output з `rsvg-convert`, reflow —
`qa-artifacts/reflow/*.png`. Reflow diff лишається діагностичним; не вимагай
`AE=0` для reflow перед релізом.

---

## 0б. Оновлення locked QA tools

Щомісячний Dependabot має три цілі: `/scripts/tools`, root `/` і GitHub
Actions. Для кожної цілі відкривається не більше одного PR; root
`package.json` зберігає exact-залежність `@11ty/eleventy` через
`versioning-strategy: increase`. G-02 у QA запускає
`npm run dependabot:validate` і відхиляє `day` у місячному розкладі.

Перед bump зафіксуй причину й цільову версію в зміні. Оновлення QA tools
проходять обов'язкову a11y-матрицю; reflow лишається інформаційним звітом.
Root bump проходить повний build і check.
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

Єдиний production deploy виконує `.github/workflows/deploy.yml` після
успішних jobs `static` і `measured-quality`. Netlify Git auto-deploy вимкнений
через `ignore = "exit 0"` у `netlify.toml`; не публікуй зміни через Netlify Git.

Workflow запускається на `push` у `main` або вручну. Deploy-job отримує
`dist/` як artifact і виконує:

```bash
npx netlify-cli deploy --prod --dir=dist
```

Автор зберігає в GitHub Actions Secrets:
`NETLIFY_AUTH_TOKEN` і `NETLIFY_SITE_ID`.

Не обходь `static` або `measured-quality`. Якщо будь-який gate падає,
`deploy` має статус skipped і production не змінюється.

---

## 0. Тріаж DNS/HTTPS (3 хвилини)

```bash
# 1. Делегування та A-відповідь:
dig NS koztechie.fyi +noall +answer
dig +short A koztechie.fyi
# 2. Прямий HTTPS через одну з отриманих A-адрес, без DNS-резолву curl:
IP="$(dig +short A koztechie.fyi | head -n1)"
curl -sI https://koztechie.fyi/ --resolve "koztechie.fyi:443:${IP}" | head -3
# 3. Звичайний запит після перевірки напряму:
curl -sI -m 10 https://koztechie.fyi/ | head -3
```

| Симптом | Гілка |
|---|---|
| `dig NS` не повертає Netlify DNS `*.p07.nsone.net`, A немає або A не відповідає активній цілі зони Netlify | **A. DNS** |
| Прямий запит через `curl --resolve` відповідає `200`, а звичайний запит — ні | **A. DNS / кеш резолвера** |
| A відповідає активній Netlify-цілі, але `curl --resolve` не проходить з'єднання/сертифікат | **B. HTTPS / Netlify endpoint** |
| Канонічний домен і кожна перевірена A-адреса не відповідають | **E. Netlify / endpoint** |
| Сайт відповідає, але впали заголовки (нема CSP/HSTS/`noai`) | **D. Заголовки** |

---

## A. DNS: не резолвиться або старі IP

**Еталон:** авторитетні NS — Netlify DNS (`*.p07.nsone.net`). Apex A-відповідь
географічно залежить від резолвера; не звіряй її з фіксованим списком IP.
Перевір, що apex-запис у зоні Netlify DNS налаштований на поточний Netlify
endpoint, і що запит до кожної отриманої A-адреси проходить через
`curl --resolve` та повертає HTTP 200.

1. Перевір NS і A:
   ```bash
   dig NS koztechie.fyi +noall +answer
   dig A koztechie.fyi +noall +answer
   ```
2. Звір NS з Netlify DNS (`dns1.p07.nsone.net.` … `dns4.p07.nsone.net.`).
   Якщо делегування інше — зупинися й виправ його у реєстратора за актуальними
   NS з панелі Netlify; не створюй DNS-зону в Spaceship.
3. У панелі Netlify DNS перевір apex-запис і його ціль. Не підставляй
   запам'ятовані A-IP; вони можуть відрізнятися за регіоном.
4. Для кожної відповіді A перевір домен без DNS-залежності:
   ```bash
   for IP in $(dig +short A koztechie.fyi); do
     curl -sI https://koztechie.fyi/ --resolve "koztechie.fyi:443:${IP}" | head -1
   done
   ```
   Очікувано: кожен запит повертає HTTP 200. Після поширення DNS звичайний
   `curl -sI https://koztechie.fyi/` також має повернути 200.
5. Далі — розділ «Після будь-якої дії».

**Довідка для відкату DNS:** історичний openresty-сервер описано в
`deploy.md` §8; він вимкнений і не є чинним DNS-еталоном.

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
3. Дзеркало `koztechie.netlify.app` перенаправляє на канонічний `.fyi` і не є
   резервним вузлом. Для перевірки Netlify endpoint без DNS-залежності див. A:
   виконай `curl --resolve` для кожної отриманої A-адреси.
4. Після завершення інциденту — «Після будь-якої дії».

---

## Відкат деплою (крок за кроком)

1. Знайди останні деплої сайту:
   ```bash
   : "${NETLIFY_SITE_ID:?Задай ID сайту Netlify}"
   netlify api listSiteDeploys \
     --data '{ "site_id": "'"$NETLIFY_SITE_ID"'", "per_page": 10 }'
   ```
   Вибери останній відомий добрий production deploy: `state` має бути
   `ready`, `context` — `production`. Збережи його `id` як `DEPLOY_ID`.
2. Віднови його офіційним API-методом:
   ```bash
   : "${DEPLOY_ID:?Задай ID відомого доброго deploy}"
   netlify api restoreSiteDeploy \
     --data '{ "site_id": "'"$NETLIFY_SITE_ID"'", "deploy_id": "'"$DEPLOY_ID"'" }'
   ```
   `netlify deploy:restore` і `netlify deploy:list` не існують у Netlify CLI
   27.20.0; `restoreSiteDeploy` — канонічний метод відновлення. Для списку
   використано `listSiteDeploys`, бо команда `deploy:list` у цій версії CLI
   відсутня.
3. Або зроби `git revert` проблемного commit і дозволь workflow
   виконати повний build та обидва QA-gates перед повторним deploy.
4. Перевір production за розділом «Після будь-якої дії».
5. **Заборонено** видаляти погані деплої до повної верифікації — вони
   потрібні як доказ для діагностики.

`deploy.yml` запускає `live-probe:light` одразу після production deploy. Якщо
smoke завершується помилкою, workflow бере ID щойно створеного deploy із
`deploy --json`, знаходить через `netlify api listSiteDeploys` попередній
`ready` production deploy і викликає `restoreSiteDeploy`. Після відновлення
запускається той самий live-smoke з `LIVE_PROBE_ALLOW_LEGACY_PROVENANCE=1`:
це дозволяє пропустити provenance лише коли старий deploy повертає 404 на
`/version.json` і очікуваний SHA не заданий. Усі перевірки сторінок, заголовків,
CSS, redirects і canonical mirror лишаються обов’язковими; невалідний JSON чи
інший HTTP-статус не ігнорується. Звичайний post-deploy smoke не має цього
прапорця та вимагає збіг `EXPECTED_COMMIT_SHA`, `version.json` і `x-commit`.
Якщо попереднього deploy немає або повторний smoke не проходить, workflow
лишається failed: перевір стан вручну за цим розділом; не запускай сліпий
повторний deploy.

---

## Після будь-якої дії (обов'язкова верифікація)

Повний чек-лист із очікуваними відповідями: **`docs/deploy.md` §6**.
Мінімум — перевірити делегування, HTTP напряму до отриманої A-адреси та
звичайний production-запит:

```bash
dig NS koztechie.fyi +noall +answer                       # → dns*.p07.nsone.net
dig +short A koztechie.fyi                                # геозалежні A; звіряти з Netlify DNS
IP="$(dig +short A koztechie.fyi | head -n1)"
curl -sI https://koztechie.fyi/ --resolve "koztechie.fyi:443:${IP}" | head -1
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
dig NS koztechie.fyi +noall +answer                     # еталон: Netlify DNS / *.p07.nsone.net
dig +short A koztechie.fyi                              # geo-залежна A-відповідь, не фіксований IP
IP="$(dig +short A koztechie.fyi | head -n1)"
curl -sI https://koztechie.fyi/ --resolve "koztechie.fyi:443:${IP}" | head -3 # без DNS
curl -sI https://koztechie.fyi/ | head -3              # живий?
curl -sI https://koztechie.netlify.app/ | head -3      # 301 на канонічний .fyi
curl -sI https://koztechie.fyi/poetry/ | grep -i x-robots-tag   # ШІ-правило
npm run check                                           # локальні гейти (0/0)
```

**Порядок дій:** триаж → гілка (A–E) → дія → «Після будь-якої дії» →
записати інцидент у `docs/STATE.md` (дата, симптом, причина, що виправлено).
