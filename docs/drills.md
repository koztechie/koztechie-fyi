# T5.2 — Quarterly chaos drills

Дата прогону: 2026-11-18  
Гілка: `drill/t5-2-chaos`  
Результат: усі 7 ін’єкцій відхилені; дефектів, що уникнули gate, немає.

Прогін виконувався на throwaway branch. Після кожної ін’єкції gate мав
завершитися ненульовим кодом. Після перевірки всі ін’єкції вилучено, а гілку
видалено.

| Дефект | Ін’єкція | Gate-ID | Перевірка |
| --- | --- | --- | --- |
| `<img>` без `alt` | Додано `<img src="/favicon.svg">` у footer | `CHECK-5-HTML-ALT` | `npm run check` відхилив `404.html — <img> без alt` |
| Дубльоване ім’я посилання | Додано друге посилання з доступним ім’ям `Контакт` і іншим `href` | `CHECK-7У-LINK-NAMES` | `npm run check` відхилив кілька `href` для `Контакт` |
| Неправильна мова scroll label | Українським label замінено англійський label на EN-сторінці | `CHECK-7Н-SCROLL-LABEL` | `npm run check` відхилив очікуване `Table (scrollable)` |
| `overflow-x:hidden` | Додано декларацію у `src/styles/core.css` | `CHECK-2А-OVERFLOW` | `npm run check` відхилив приховування переповнення |
| Не-AAA token | `--ink-dim` змінено на `#777777` | `PALETTE-AAA` | `npm run palette` відхилив не дозволений колір у зібраному CSS |
| Бите зовнішнє посилання | Додано `https://invalid.example.invalid/t5-2-drill` у fixture `dist` | `EXTERNAL-LINKCHECK-STRICT` | `LINKCHECK_STRICT=1 npm run linkcheck:external` відхилив network failure як `HARD` |
| `·` у словнику | Додано `·` до рядка `uk.json` | `CHECK-2Д-SR-SEPARATORS` | `npm run check` відхилив символ поза `aria-hidden` |

## 5. Реєстр «дефект → гейт → дрил» (ядро антикрихкості)

Це ядро антикрихкості: кожен постійний gate має відповідну ін’єкцію
або явно зафіксований виняток. D-ін’єкцію виконують лише на throwaway-гілці;
після перевірки гілку та fixture видаляють. Рядок у реєстрі не є доказом
виконаного прогону без окремого запису результату.

| Знахідка | Постійний гейт | Chaos-ін'єкція | Cadence |
|---|---|---|---|
| F-01 email / З-08 DKIM | G-01 MX/SPF/DKIM/DMARC/Contact probe | D-01 MX; D-01-ext без DKIM | щотижня + квартал |
| З-01 phantom rollback | `check-runbook-commands` | D-12 `deploy:restore` у runbook | кожен push |
| З-01/04 робочий відкат | post-deploy smoke + auto-rollback | D-11/D-14: зламаний header → відкат | кожен deploy |
| З-02 runner | CI `ubuntu-24.04` + OG `AE=0` | D-15 старий еталон | кожен push |
| З-03 CLI pin | `check-deploy-pin` | D-13 прибрати pin | кожен push |
| З-05 CSS N-1 | live-probe: старий fingerprint доступний | D-16 прибрати continuity | live щотижня |
| З-06 CSS budget | `size-budget` рахує активну пару | D-17 додати третю пару | кожен push |
| З-07 LCP | G-19 + Lighthouse desktop LCP-insight | D-19 lazy на першому кадрі | кожен push |
| F-02 dependabot | G-02 schema-validate конфігу в CI | D-02 `day:"1"` | кожен push |
| F-03 sitemap | G-03 count==publicPages + парність | D-03 видалити вірш із sitemap | кожен push + live |
| F-04 deploy | G-08 deploy `needs` повна QA | D-08 a11y-дефект → немає деплою | кожен push |
| F-05 заява | G-14 свіжість дати + живий feedback | D-10 AT-повтор | квартал |
| F-06 cache | G-04 HTML must-revalidate / assets long | D-09 long-cache на HTML | live щотижня |
| F-07 email-plain | CHECK-EMAIL-PLAIN | D-05 plain hello@ | кожен push |
| F-11 OG | G-11 AE=0 на продакшні | D-09 підміна пікселя | щотижня |
| F-16 feed | G-05 абсолютні URL | D-06 відносний href | кожен push |
| F-15 manifest | G-06 обов'язкові поля | D-07 видалити start_url | кожен push |
| F-08 recovery | G-13 SOA↔документ | дрил відновлення | квартал |
| F-13 deps | G-12 npm audit=0 | — | місяць |
| F-17 / З-18 dist allowlist | `check-dist-inventory` | D-18 додати `dist/leak.txt` | кожен push |
| З-11/14 index/404 | post-deploy probe | D-20 видалити directory-index генерацію | кожен deploy |

`G-12` має виняток: advisory fixture не додається до dependency tree
штучно. Його gate перевіряється реальним audit, а оновлення залежностей —
окремим cadence-процесом.

## 7. Definition of Done / цільові метрики

| Метрика | Зараз | Ціль | Гейт |
|---|---|---|---|
| CI HEAD | 🔴 dependabot | 🟢 усі green | G-02 |
| Канал зв'язку | мертвий | MX+SPF+DKIM+DMARC pass, тестовий лист отримано | G-01 |
| Sitemap / publicPages | 28 / 30 | 30 / 30 | G-03 |
| Deploy без повної QA | можливий | неможливий | G-08 |
| Ручна AT | 2/9 | 9/9 PASS | G-14 |
| Сторінка (br) | ≤9.4 КіБ | ≤50 КіБ (лишити) | size-budget |
| CSS (br) | 6.01 КіБ | ≤15 КіБ | size-budget |
| JS | 0 Б | 0 Б | check 7а |
| Контраст body | 7.26–17.95:1 | ≥7 AAA | palette |
| LCP mobile (simulate) | не виміряно чесно | <1.5 с | G-10 |
| CLS / TBT | 0 / 0 | 0 / 0 | LHCI |
| OG продакшн AE | не перевірено | 0 | G-11 |
| Plain email у HTML | 3 згадки | 0 | CHECK-EMAIL-PLAIN |
| npm audit high/crit | не запускається | 0 | G-12 |
| Chaos-дили | 7 класів | 17+ класів, усі відхилені | drills.md |

## P5 — статус D-01…D-10

Реєстр T4.5 описує потрібні класи, але не є доказом фактичного chaos run.
Станом на 2026-11-19 у цьому репозиторії немає журналу throwaway-прогону
`D-01…D-10`, тому БРАМУ 10 за цим пунктом не закрито.

| Ін’єкція | Gate | Статус |
|---|---|---|
| D-01 видалити MX у fixture | G-01 | ⏳ потрібен DNS fixture і ненульовий gate |
| D-02 `day:"1"` | G-02 | ⏳ потрібен throwaway-конфіг |
| D-03 видалити вірш із sitemap | G-03 | ⏳ потрібен throwaway-контент |
| D-04 дефект cache-заголовка | G-04 | ⏳ потрібен live fixture |
| D-05 plain `hello@` | CHECK-EMAIL-PLAIN | ⏳ потрібен throwaway-контент |
| D-06 відносний feed href | G-05 | ⏳ потрібен throwaway-feed |
| D-07 видалити `start_url` | G-06 | ⏳ потрібен throwaway-manifest |
| D-08 a11y-дефект | G-08 | ✅ PASS — 2026-11-20; журнал нижче |
| D-09 long-cache / OG pixel | G-04 / G-11 | ⏳ потрібні окремі fixtures |
| D-10 AT-повтор | G-14 | ⏳ потрібен авторський AT-сеанс |

Кожен рядок переводь у `PASS` лише після запису дати, throwaway-гілки,
команди, ненульового коду gate та факту видалення fixture/гілки. D-09 містить
два різні класи дефектів і має бути виконаний двома окремими ін’єкціями.

## D-01-ext — відсутній DKIM у DNS fixture

**2026-11-20 — PASS, fixture проганяється у `npm run qa:all`.**

- `scripts/drill-email-dns-gate.mjs` ін’єктує MX, SPF, DMARC і security.txt,
  але не повертає TXT для `zmail._domainkey.fixture.example`.
- Той самий `runEmailDnsGate` production runner завершується кодом 1 та
  повідомляє про відсутній DKIM selector.
- Fixture ізолює resolver і HTTP fetch у пам’яті; реальний DNS та production
  конфігурація не змінюються.

## D-08 — a11y-дефект блокує production deploy

**2026-11-20 — PASS; дефект не потрапив у production.**

- Throwaway-гілка `drill/d-08-a11y-gate`, commit `05dd2c5`: приховано
  клавіатковий фокус посилання контактної сторінки (`outline: none`).
- `npm run check` у production workflow завершився кодом 1 на перевірці
  `CSS: ховає фокус — outline: none`; job `Static QA gate` — failure.
- Production workflow run
  [44786302480](https://github.com/koztechie/koztechie-fyi/actions/runs/44786302480)
  запущено вручну з throwaway ref: `Measured quality gate` і
  `Deploy production` — skipped; жоден production deploy не створювався.
- PR #19: обов’язковий `Measured quality budgets` завершився failure; PR
  закрито без merge. Це лишило `main` захищеним required checks.
- Після дрилу `/version.json` і `main HEAD` досі мали SHA
  `d0e8c8fca0056b53b4de2710d747c5c864250bed`.
- PR і віддалену throwaway-гілку видалено; ін’єкцію прибрано.

## D-11 — production rollback (T-1.1)

**2026-11-19 — PASS, ручний дрил; автоматичний gate T-1.3 ще не додано.**

- Throwaway-гілка: `drill/d-11-prod-rollback` (локально видалена після прогону).
- Ін’єкція: вилучено `X-Frame-Options: DENY` із `static/root/_headers`.
- Deploy: `6aff1abc5bb5826b496bfce8` (`production`, `ready`); live-заголовок
  був відсутній.
- Відкат виконано командою `netlify api restoreSiteDeploy` з runbook,
  `DEPLOY_ID=6aff16a0164640cedf7e68d0`.
- Перевірка після відкату: активний deploy знову
  `6aff16a0164640cedf7e68d0` (`ready`, `production`); CSP, HSTS,
  Referrer-Policy, Permissions-Policy, X-Content-Type-Options і
  X-Frame-Options присутні на production.
- Повторні `npm run build` і `npm run check` після вилучення ін’єкції — pass.

## D-12 — невідома команда Netlify у runbook (T-1.3)

**2026-11-19 — PASS.** У тимчасовий bash-блок `docs/runbook.md` додано
`netlify deploy:restore`. `node scripts/check-runbook-commands.mjs` завершився
кодом 1 і вказав невідому команду; ін’єкцію вилучено, повторний гейт проходить.

## D-13 — вилучений pin Netlify CLI (T-2.1)

**2026-11-19 — PASS.** Тимчасово вилучено `netlify-cli` із
`scripts/tools/package.json`. `node scripts/check-deploy-pin.mjs` завершився
кодом 1 з повідомленням про обов’язковий точний pin `27.20.0`; початковий
manifest відновлено, гейт проходить.

## D-14 — post-deploy CSP smoke і rollback (T-2.2)

**2026-11-19 — PASS, production.**

- Throwaway-гілка: `drill/d-14-post-deploy-rollback` (локально видалена).
- На гілці прибрано CSP з `static/root/_headers`. Збірка до ін’єкції пройшла;
  build-time CSP/favicon guard зупиняє звичайну збірку без `style-src`, тому
  ту саму CSP-ін’єкцію прибрано також із готового `dist/_headers` перед deploy.
- Пошкоджений production deploy: `6aff2ac9914fefa5e86157a7`.
- `npm run live-probe:light` завершився кодом 1: CSP відсутня на чотирьох
  перевірених сторінках.
- `scripts/rollback-production.mjs` обрав попередній `ready` production
  `6aff26050731eec078e893e0`, відновив його через `restoreSiteDeploy` і
  повторно запустив live-smoke — PASS. CSP та `X-Frame-Options` на production
  підтверджені; повторний зовнішній smoke — PASS.

## D-15 — stale visual reference після міграції runner-а (T-3.3)

**2026-11-19 — PASS.**

- Позитивний baseline run `44583333266` на PR #15 (head `cb228c3`):
  `static` і `measured-quality` пройшли на `ubuntu-24.04`. Determinism:
  два послідовні build дали ідентичний `dist`; favicon і всі 15 OG references
  — `AE=0`; усі 9 reflow screenshots — без diff, у межах tolerance.
- Під час перевірки використано ImageMagick
  `8:6.9.12.98+dfsg1-5.2build2`, Playwright `1.65.1` / Chromium
  `159.0.8154.6` (`v1255`); runner toolchain записано в `docs/environment.md`.
- Ін’єкція: у тимчасовому коміті `454c7b0` повернуто старий
  `docs/reference/og/blog-manifesto-en-v2.png`. Run `44584973242` відхилив
  baseline: favicon `AE=0`, stale OG `AE=32954`; `static` завершився помилкою.
  `measured-quality` того самого прогону пройшов.
- Старий PNG відновлено в `c640d06`. Після відновлення run `44587135774`
  пройшов: `static` і `measured-quality` — green; усі еталони прийнято.
  Навмисна stale-версія лишається лише в історії D-15 commit.

## D-16 — втрата N-1 CSS fingerprint під час deploy (T-4.1)

**2026-11-21 — PASS: локальна модель і production acceptance.**

- Сценарій: поточний HTML уже посилається на нову пару stylesheet, але
  клієнтський stale HTML ще запитує попередній fingerprint під час purge
  propagation.
- На локальному HTTP fixture `curl` до опублікованого `dist` без збереженого
  файла повернув 404 для старого URL. Після виконання preservation-послідовності
  (витяг fingerprint з HTML → завантаження CSS → копія в `dist/styles/`) той
  самий URL повернув 200.
- Fixture також підтвердив, що `live-probe-light` завершується помилкою, коли
  попередній CSS повертає 404, і проходить, коли він повертає 200. Це локальний
  дрил, а не ін’єкція у production workflow.
- З preservation step старі fingerprint-файли з production копіюються у
  `dist/styles/`; після deploy `live-probe-light` перевіряє отримані URL-и,
  очікуючи HTTP 200.
- У production deploy run `44824303294` preservation step зберіг обидва
  попередні fingerprint-и; post-deploy `live-probe:light` підтвердив HTTP 200
  для `print.4eecbaf9f3e9.css` і `site.8e3a82a337ef.css`. Це закриває
  production acceptance для D-16 на цій версії workflow.

## D-17 — retention CSS не роздуває активний бюджет (T-4.2)

**2026-11-19 — локально PASS.**

- У тимчасовій копії збірки тричі запущено `bundle-styles.mjs`, змінюючи CSS
  перед другим і третім проходом. Отримано 3 різні site + print пари; головний
  HTML посилається на третю.
- `node scripts/size-budget.mjs <fixture>/dist` завершився кодом 0:
  retention-гейт побачив усі 3 пари, а `cssTotal` і сторінковий бюджет
  врахували лише два файли активної пари (6.3 КіБ). `node scripts/check.mjs
  <fixture>/dist` також пройшов активний CSS gate.
- Fixture існував лише в `/tmp/opencode/`; джерела та production не змінювалися.

## D-18 — неочікуваний файл у production dist (T-4.3)

**2026-11-19 — PASS, локально.**

- Додано випадковий `dist/leak.txt`; `node scripts/check-dist-inventory.mjs`
  завершився кодом 1 і назвав `leak.txt` поза allowlist.
- Після вилучення fixture гейт пройшов: 80 файлів у `dist/` відповідають
  allowlist.
- Тимчасовий Markdown-файл у корені пройшов через `npm run build`, але не
  з’явився у `dist/` завдяки `/*.md` у `.eleventyignore`.
- Fixture прибрано; source і production не змінювалися.

## D-19 — lazy loading на LCP-кадрі NICHLYST (T-5.1)

**2026-11-19 — PASS, локально.**

- Обидві локалі віддають перший кадр галереї з `loading="eager"`,
  `fetchpriority="high"`, `decoding="async"` і responsive 450w/700w/900w `srcset`.
- Варіанти, згенеровані зовнішнім cwebp: 450w — 14 462 байти (q90), 700w —
  16 282 байти (q80). Mobile Lighthouse з DPR 2 обрав саме 700w.
  `npm run check` gate G-19 перевіряє метрику `img.nichlyst-gallery
  figure:first-child`, розмір обох responsive variants та lazy-loading решти
  двох кадрів.
- Ін’єкція: тимчасово повернуто `loading="lazy"` першому img у зібраній
  українській сторінці; `npm run check` завершився кодом 1 із помилкою G-19.
  Fixture відновлено перед повторним зеленим прогоном.
- Lighthouse: desktop LCP 764 мс (performance 0.99), mobile LCP 834 мс
  (performance 0.92; лише warning-поріг композитного score); desktop LCP
  request discovery підтвердив `fetchpriority=high`, discoverable request і eager loading.
  Mobile profile запросив `/nichlyst/first-knock-700.webp`: 16 587 байтів
  transfer (16 282 байти payload). Critical CSS не інлайниться. Production
  deploy не запускався.

## D-20 — видалення генерації directory-index redirects (T-6.1)

**2026-11-19 — PASS, локально.**

- Netlify static server підтвердив `/blog/index.html` → `301 /blog/`,
  `/en/index.html` → `301 /en/`, а `/404.html` і `/en/404.html` повертають 404.
- Форсовані точні правила стоять перед `/en/* … 404`: Netlify оцінює правила
  послідовно, тож ширший fallback інакше перехоплював би `/en/index.html`.
- Дрил: генерацію postbuild відключено лише у тимчасовій копії output;
  `/blog/index.html` тоді повернув 200. Light-probe проти цієї копії
  завершився кодом 1 на перевірці очікуваного 301. Джерело після тесту
  відновлено; production не змінювався.

## D-21 — відсутній прямий HTTP www redirect (T-6.2)

**2026-11-19 — BLOCKED: Netlify нормалізує www до `_redirects`.**

- `npm run check` вимагає explicit HTTP і HTTPS www.fyi та HTTP apex правила.
- Deploy `6aff53adcc9404b36d1c0f98` містить ці правила. Після нього
  `curl -sIL http://www.koztechie.fyi/` показав 2 hops:
  HTTP www → HTTPS www → HTTPS apex.
- Тимчасово вимкнено site-level `force_ssl` і додано www до domain aliases:
  Netlify все одно перенаправив HTTP www → HTTP apex перед `_redirects`, тобто
  залишив 2 hops. Обидва hosting налаштування повернуто до початкових значень
  (`force_ssl=true`, alias list — лише `koztechie.pp.ua`).
- Final `curl` підтвердив два хопи; `npm run live-probe:light` пройшов.
  HSTS і Force HTTPS лишаються активними. One-hop acceptance потребує
  підтримуваного рішення поза поточним Netlify routing.

## D-22 — netlify.app mirror не перенаправляє (T-6.3)

**2026-11-19 — production PASS, усі три маршрути перевірено.**

- Source `_redirects` має forced 301 для `https://koztechie.netlify.app/*`
  на `https://koztechie.fyi/:splat`; `npm run check` вимагає точне правило.
- Правило розміщено перед іншими redirects. Production light-probe перевіряє
  корінь, `/en/` і вкладений URL із query string; усі мають 301 на тотожний
  шлях `.fyi` за один хоп.
- DNS-тріаж більше не використовує mirror як живий еталон: перевіряє кожну
  відповідь A окремо командою
  `curl -sI https://koztechie.fyi/ --resolve "koztechie.fyi:443:${IP}"`.
- Production deploy `6aff56afb997157ceb4d4967`: корінь уже повертає 301;
  додаткові перевірки шляху виконано після розміщення правила на початку
  `_redirects`.

## D-23 — post-deploy provenance і перевірка rollback для legacy deploy

**2026-11-21 — PASS локальна фікстура та live-перевірка відновленого production.**

- У run `44927585960` Static QA і Measured quality пройшли. Перший post-deploy
  smoke зупинився на `requestSignal is not defined` у перевірці canonical
  mirror. `restoreSiteDeploy` відновив попередній `ready` deploy
  `6b01720067a3f3a96baff3fa`.
- Повторний smoke helper-а також завершився помилкою: відновлений реліз не має
  `/version.json` і `x-commit`, бо був опублікований до provenance-файла.
  Production підтверджено на старій парі CSS fingerprint; R3.0 цим run не
  залишився опублікованим.
- Виправлено mirror timeout і rollback verification: лише helper задає
  `LIVE_PROBE_ALLOW_LEGACY_PROVENANCE=1`; він терпить тільки 404
  `/version.json` без заданого expected SHA. Звичайний probe лишається строгим
  і порівнює SHA у `version.json` з очікуваним SHA та HTML `x-commit`.
- `npm run test:live-probe` проходить локальну матрицю: правильний SHA
  приймається, розбіжність відхиляється, legacy 404 приймається лише з прапорцем,
  а некоректний `version.json` і відсутній прапорець відхиляються.
- Поточний відновлений production пройшов оновлений `live-probe:light` із
  legacy-прапорцем: 12 HTML, заголовки, stylesheet, redirects, 404/RSS і всі
  три canonical mirror маршрути.
- Після виправлення commit `8976b481ab4238a25f111cd4600720df40abbc95` успішно
  розгорнуто в run `44929792864` (Netlify deploy
  `6b01d5a5ebe97269cfea0493`). Static QA, Measured quality, post-deploy smoke
  зі строгим SHA та G-01 пройшли; повторний live-probe production також пройшов.

## Правило ескалації

Жоден дефект не уникнув відповідного gate. Якби gate завершився кодом `0`,
того самого дня потрібно було б додати відсутню перевірку, повторити цей
дефектний fixture на throwaway-гілці й внести новий зв’язок у таблицю.
