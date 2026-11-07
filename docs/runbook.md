# RUNBOOK: алгоритм при падінні (PLAN 164)

**Мета:** за ≤ 5 хв визначити причину й усунути. Порядок — від найчастішого
до рідкісного. Кожна гілка завершується **верифікацією** (розділ «Після будь-якої дії»).

**Джерела:** `docs/deploy.md` (§6 верифікація, §7 відкат, §8 старий сервер),
`docs/ARCHITECTURE.md` §9 (`netlify.toml`, `_headers`, `_redirects`).

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
