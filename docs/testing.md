# Перевірка змін

Цей процес відповідає кроку PLAN 182. Вибирай найменшу перевірку, що доводить
зміну, а перед публікацією запускай повний набір.

## Локальний цикл

1. Відтвори дефект або перевір вимогу на поточній версії.
2. Додай/онови негативний fixture чи регресійний тест, якщо його можна
   ізолювати без нової залежності. Ієрархію контакту головної перевіряють
    `npm run test:home-contact` і G-07 у `npm run check`. Пояснення концепції
     вузла перевіряють `npm run test:home-concept`; скорочений паспорт і
     перенесення бюджету до двомовного колофона — `npm run test:home-passport`
     та G-07. Спільну
   композиційну сигнатуру відкритого реєстру перевіряють
   `npm run test:composition-signature` і G-07; різні режими сторінок та їхні
   негативні мутації — `npm run test:page-experience` і той самий G-07.
    Узгодженість концепції між `DECISIONS.md`, `PLAN.md`, `AGENTS.md`,
    дизайн-системою та позначеними історичними wireframe-ами захищає
    `npm run test:design-metaphor` і G-07. Активний пункт навігації перевіряють
    `npm run test:active-nav` і G-07: семантичне позначення, контрастне тло,
    моноширинний напис та квадратні дужки мають існувати разом. Мобільна
    навігація — `npm run test:mobile-nav` і G-07: горизонтальний рядок,
    прокрутка без переносу, всі чотири пункти та відсутність багаторядкових
    правил на вузьких breakpoints.
3. Після змін виконай:

    ```bash
    npm run build
    npm run check
    npm run qa:all
    npm run check:lighthouse-mobile
    git diff --check
    ```

    `qa:all` запускає статичні гейти, контентні перевірки, бюджет, внутрішні
    лінки та вбудовані seeded-drills, зокрема `test:live-probe` для суворого
    provenance й rollback-сумісності. Якщо змінено генерацію, CSS або
    стабільність виходу, додай `npm run check:determinism`.
    `check:lighthouse-mobile` перевіряє конфігурацію G-10, а не запускає
    вимірювання. Mobile Lighthouse виконується окремо locked LHCI tool-ом:

    ```bash
    cd scripts/tools
    npx @lhci/cli autorun \
      --config=../../.lighthouserc.mobile.json \
      --collect.staticDistDir=../../dist \
      --upload.outputDir=../../qa-artifacts/lhci-mobile
    cd ../..
    ```

    У CI запускається та сама команда. Розрізняй `error`-гейти LCP/CLS/TBT та
    SEO/a11y від діагностичного warning composite performance score.
4. Для редакційного тексту окремо виконай `npm run validate` і
   `npm run voice-lint`; `qa:all` також включає обидві перевірки.
5. Прочитай diff і перевір результат у `dist/`. Не додавай `dist/` до Git.

## Межі автоматичних перевірок

- `npm run check` перевіряє локальний зібраний HTML/CSS і контрактні правила.
- `npm run palette` перевіряє палітру; `npm run size` — вагу сторінок та
  ресурсів; `npm run linkcheck` — локальні внутрішні посилання.
- `npm run live-probe:light` перевіряє зовнішній production endpoint і
  заголовки; повний `npm run live-probe` додає розширені зовнішні перевірки.
- `LIVE_PROBE_ALLOW_LEGACY_PROVENANCE=1` використовує лише helper автоматичного
  rollback: він дозволяє відсутній `/version.json` зі статусом 404 на старому
  deploy, але не послаблює інші production-перевірки.
- CI окремо запускає обов'язкові accessibility-матрицю, Lighthouse,
  Pa11y/axe та `html-validate`; лише pixel-diff reflow є інформаційним.
  Помилки запуску браузера чи інструментів залишаються помилками.
- Автоматичні тести не доводять повну WCAG-відповідність і не замінюють
  NVDA/VoiceOver, масштабування та інші ручні перевірки. Позначай їх
  `BLOCKED`, якщо пристрій чи середовище недоступні; не оголошуй їх пройденими.

## Перевірка production

- До релізу: `npm run build && npm run qa:all`.
- Деплой виконуй тільки дозволеним процесом із `docs/deploy.md`.
- Після релізу перевір production smoke/live-probe та ключові зміни саме на
  опублікованому origin. Локальний `dist` не є доказом production-стану.
- Дефект із відтворюваним уроком занеси одним рядком до `docs/lessons.md`;
  деталі сценаріїв і fixture — до `docs/drills.md`.
