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
| F-01 email | G-01 MX/SPF/DMARC/Contact probe | D-01 видалити MX у fixture | щотижня + квартал |
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
| D-08 a11y-дефект | G-08 | ⏳ потрібен перевірений CI run |
| D-09 long-cache / OG pixel | G-04 / G-11 | ⏳ потрібні окремі fixtures |
| D-10 AT-повтор | G-14 | ⏳ потрібен авторський AT-сеанс |

Кожен рядок переводь у `PASS` лише після запису дати, throwaway-гілки,
команди, ненульового коду gate та факту видалення fixture/гілки. D-09 містить
два різні класи дефектів і має бути виконаний двома окремими ін’єкціями.

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

## Правило ескалації

Жоден дефект не уникнув відповідного gate. Якби gate завершився кодом `0`,
того самого дня потрібно було б додати відсутню перевірку, повторити цей
дефектний fixture на throwaway-гілці й внести новий зв’язок у таблицю.
