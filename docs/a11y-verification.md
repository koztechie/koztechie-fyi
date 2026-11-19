# Протокол перевірки assistive technology

**Дата запису:** 2026-11-19<br>
**Коміт автоматичних перевірок:** `104f945`<br>
**Статус:** ручні перевірки потребують виконання на фізичних або системних
пристроях; результати нижче не підміняють NVDA, VoiceOver чи TalkBack.

## Результати

| # | Середовище | Результат | Доказ / примітка |
|---:|---|---|---|
| 1 | NVDA + Firefox, українська головна | **BLOCKED** | NVDA і Firefox з AT не доступні в середовищі агента. Перевірити skip-link «До основного вмісту», `Enter` на `<main id="main">`, потім перший hero-текст. |
| 2 | NVDA, `/nichlyst/` і `/colophon/` | **BLOCKED** | Потрібен NVDA Elements List. Автоматичні перевірки доступних імен посилань проходять у `npm run check`; оголошення NVDA не перевірене. |
| 3 | NVDA, `/cemetery/svitlogics/` | **BLOCKED** | Потрібне прослуховування entry line. DOM/CSS-аналіз не підтверджує відсутність озвучення декоративних символів. |
| 4 | VoiceOver + Safari, `/en/colophon/` | **BLOCKED** | Safari і VoiceOver не доступні. Перевірити англійську назву scroll region та асоціацію заголовків таблиці через Rotor. |
| 5 | VoiceOver, `/en/` | **BLOCKED** | VoiceOver не доступний. Перевірити озвучення «УКР» українським голосом через Rotor → Links. |
| 6 | TalkBack + Chrome Android | **BLOCKED** | Android/TalkBack не доступні. Автоматична матриця `32 × 7` проходить; `npm run check` підтверджує touch-target контракт, але не swipe-навігацію чи озвучення `role="note"`. |
| 7 | Edge + Windows High Contrast | **BLOCKED** | Windows High Contrast і ручна Tab-перевірка не доступні. Автоматичний режим `forced-colors` у a11y-матриці проходить; CSS містить `Highlight` для фокуса. |
| 8 | Zoom 200/400%, viewport 320 px | **PARTIAL** | Автоматична матриця проходить режими `zoom-200` і `reflow-320`; reflow CI проходить із tolerance. Ручна перевірка 400% і фізичного горизонтального скролу не виконана. |
| 9 | Stylus / reader mode, text spacing | **PARTIAL** | A11y-матриця проходить `text-spacing` override. Reader mode та перевірка стилусом не доступні. |

## Автоматичні докази

Запущено в CI `44246081443`:

- a11y-матриця: кожен `dist/**/*.html` у 7 режимах, зокрема
  `forced-colors`, `zoom-200`, `text-spacing`;
- Lighthouse desktop і mobile;
- Pa11y/axe для кожного HTML;
- HTML validation;
- reflow з ImageMagick tolerance.

Автоматичні докази не закривають ручні `BLOCKED` пункти. Після виконання
перевірок на цільових пристроях заміни `BLOCKED`/`PARTIAL` на `PASS` або
зафіксуй конкретний дефект із версією ОС, браузера, AT і URL.

## Форма ручного повторного запуску

```text
Дата:
ОС / версія:
Браузер / версія:
Assistive technology / версія:
Сторінка:
Пункт протоколу:
Результат: PASS / FAIL
Озвучений текст:
Дефект / артефакт:
```
