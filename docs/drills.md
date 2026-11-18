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

## Правило ескалації

Жоден дефект не уникнув відповідного gate. Якби gate завершився кодом `0`,
того самого дня потрібно було б додати відсутню перевірку, повторити цей
дефектний fixture і внести новий зв’язок у таблицю.
