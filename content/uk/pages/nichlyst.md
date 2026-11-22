---
title: "NICHLYST"
lang: uk
layout: project.njk
structured_data: nichlyst
updated: 2026-11-20
content_warning: [війна, травма]
summary: "NICHLYST — сюжетна гра для Android про збирання та збереження людських свідчень."
og_description: "Сюжетна гра для Android про збирання та збереження пам'яті від Євгенія Козловського."
og_title: "NICHLYST — koztechie"
og_image: "/og/nichlyst-uk-v2.png"
og_image_alt: "koztechie — темне поле NICHLYST із назвою гри та теракотовою лінією."
translation_status: complete
draft: false
---

NICHLYST — це сюжетна гра для Android про роботу з пам'яттю та збереження свідчень. Щодня до вас приходять люди зі своїми історіями: ваше завдання — вислуховувати їх, фіксувати свідчення та оберігати їх від зіпсуття.

<aside class="content-disclaimer" role="note">
  <p>Усі локації, країни та персонажі повністю вигадані.</p>
</aside>

## Що це за гра

Ви ведете архів у вигаданому підземному вузлі. Читаєте свідчення й вирішуєте, що з ними зробити: записати, приховати чи відхилити. Вибори змінюють стан архіву та його ресурси.

- 40 днів сюжетної гри.
- Шість ресурсів архіву: пальне, їжа, довіра, витривалість, пам'ять і варта.
- Українська й англійська мови.

## Кадри з гри

<div class="nichlyst-gallery">
  <figure>
    <img src="/nichlyst/first-knock.webp" width="900" height="883"
      alt="Перший день гри: свідчення Хоми та три варіанти відповіді архівіста."
      loading="eager" fetchpriority="high" decoding="async"
      srcset="/nichlyst/first-knock-450.webp 450w, /nichlyst/first-knock-700.webp 700w, /nichlyst/first-knock.webp 900w"
      sizes="(max-width: 40rem) calc(100vw - 2rem), 40rem">
    <figcaption>День 1. Перше свідчення й вибір відповіді. <a href="/nichlyst/first-knock.webp" download aria-label="Завантажити кадр: день 1, перше свідчення (WebP, 27 КБ)">Завантажити кадр</a></figcaption>
  </figure>
  <figure>
    <img src="/nichlyst/choice-recorded.webp" width="900" height="883" alt="Наслідок вибору: запис свідчення в реєстрі та кнопка продовження." loading="lazy" decoding="async">
    <figcaption>Наслідок рішення. <a href="/nichlyst/choice-recorded.webp" download aria-label="Завантажити кадр: наслідок рішення (WebP, 36 КБ)">Завантажити кадр</a></figcaption>
  </figure>
  <figure>
    <img src="/nichlyst/title-screen.webp" width="900" height="883" alt="Стартовий екран NICHLYST із назвою гри та кнопкою відкриття архіву." loading="lazy" decoding="async">
    <figcaption>Стартовий екран. <a href="/nichlyst/title-screen.webp" download aria-label="Завантажити кадр: стартовий екран (WebP, 6 КБ)">Завантажити кадр</a></figcaption>
  </figure>
</div>

## Статус і доступ

<p class="nichlyst-status">У розробці. Реліз — коли буде готовий.</p>

Пролог буде доступний без оплати. Повну гру відкриватиме одна разова покупка; підписки немає. Ціну буде показано в магазині перед покупкою.

Мінімальна версія Android у конфігурації застосунку — Android 7.0 (API 24).

Гра має віковий рейтинг 16+. Наративні push-повідомлення надходять через OneSignal; їх можна вимкнути в налаштуваннях пристрою. Sentry надсилає анонімні технічні звіти про збої.

Політика конфіденційності гри: [прочитати українською](/nichlyst/privacy/) або [англійською](/en/nichlyst/privacy/).

## Прескіт

<figure class="nichlyst-logo">
  <img src="/nichlyst/logo.webp" width="512" height="512" alt="Логотип NICHLYST: паперовий журавель над назвою гри." loading="lazy" decoding="async">
  <figcaption><a href="/nichlyst/logo.webp" download>Завантажити логотип</a></figcaption>
</figure>

### Як використовувати логотип

Використовуйте оригінальний квадратний файл 512 × 512 px без обрізання, розтягування, перефарбування, фільтрів чи накладання тексту. Фон є частиною зображення. Залишайте навколо логотипа вільне поле щонайменше 5% його ширини; не розміщуйте його на візуально складному тлі. Не відокремлюйте журавля від напису й не змінюйте їх взаємне розташування.

### Факт-лист

<dl class="nichlyst-facts">
  <div><dt>Назва</dt><dd>NICHLYST</dd></div>
  <div><dt>Жанр</dt><dd>Сюжетна гра</dd></div>
  <div><dt>Розробник</dt><dd>Євгеній Козловський / koztechie</dd></div>
  <div><dt>Платформа</dt><dd>Android</dd></div>
  <div><dt>Локалізація</dt><dd>Українська (uk), англійська (en)</dd></div>
  <div><dt>Формат покупки</dt><dd>Разове розблокування повної гри</dd></div>
  <div><dt>Віковий рейтинг</dt><dd>16+</dd></div>
  <div><dt>Повідомлення</dt><dd>Наративні push через OneSignal; можна вимкнути в налаштуваннях пристрою</dd></div>
  <div><dt>Звіти про збої</dt><dd>Sentry; анонімні технічні дані</dd></div>
  <div><dt>Сайт</dt><dd><a href="https://koztechie.fyi/nichlyst/">koztechie.fyi/nichlyst/</a></dd></div>
  <div><dt>Контакт для преси</dt><dd><a href="mailto:{{ (strings[lang] | default(strings.uk)).footer.email | safe }}">{{ (strings[lang] | default(strings.uk)).footer.email | safe }}</a></dd></div>
  <div><dt>Статус</dt><dd>У розробці; дата релізу не оголошена</dd></div>
</dl>
