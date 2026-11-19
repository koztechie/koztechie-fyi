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

## Правило ескалації

Жоден дефект не уникнув відповідного gate. Якби gate завершився кодом `0`,
того самого дня потрібно було б додати відсутню перевірку, повторити цей
дефектний fixture і внести новий зв’язок у таблицю.
