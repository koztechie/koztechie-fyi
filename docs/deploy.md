# ДЕПЛОЙ: koztechie.fyi → Netlify (DNS, HTTPS)

**Статус:** крок PLAN 157. Інструкція для виконання **вручну** — у сесії ШІ немає
доступу до акаунта Netlify (OAuth) та панелі DNS реєстратора, отже ці кроки
виконує автор. Усе інше (конфіг, збірка, перевірки) — підготовлено й перевірено.

**Перевірено:** 2026-11-07. Команда збірки Netlify прогнана локально чисто
(`npm ci --ignore-scripts && npm run build && npm run check` → 0 помилок).

---

## СТАН ВИКОНАННЯ (оновлено 2026-11-07)

| Крок | Стан |
|------|------|
| `netlify.toml` у репо | ✅ виконано (`d80a4e4`) |
| Сайт у Netlify | ✅ **вже існує**: проєкт `koztechie` (id `4b260726-36ea-4bfe-8c1f-b5a693294e76`), primary = `koztechie.pp.ua` |
| Свіжий деплой поточного контенту | ✅ виконано через MCP: деплой `6aef2fce1146a57aefeb9a0a`, стан `ready`, «27 generated pages,13 assets», `4 header rules`; pp.ua оновився (було: від 03.09 з репо `koztechie-hub`) |
| Додати домен `koztechie.fyi` до проєкту | ⏳ **РОБИТЬ АВТОР** (панель Netlify — інструменту в MCP немає) + увімкнути Force HTTPS після видачі сертифіката |
| DNS у Spaceship | ⬜ після пункту вище — виконує ШІ (інструменти `dns_records_save/delete` підтверджені; домен `koztechie.fyi` є в акаунті) |
| HTTPS-верифікація | ⬜ автоматично після DNS (Let's Encrypt) — перевірка за §6 |

**Підтверджені DNS-цілі (доки Netlify, 2026-11-07):** apex ALIAS →
`apex-loadbalancer.netlify.com`; www CNAME → `koztechie.netlify.app`.
**Старі A для відкату:** `34.216.117.25`, `54.149.79.189` (зона відповідає
ними й досі — авторитетний запит до `launch1.spaceship.net`).

**Git-інтеграція:** проєкт попередньо деплоївся через API з репо
`koztechie-hub`. Автодеплою з `koztechie-fyi` НЕМАЄ — варіанти: (а) підключити
репо у панелі (Netlify → Site configuration → Build & deploy → Link to Git
repository) тоді кожен push на `main` збирається сам; (б) деплої через MCP
вручну. Рішення — за автором.

---

## 0. Стан на початок (зафіксовані факти)

| Що | Стан |
|----|------|
| `koztechie.fyi` NS | `launch1.spaceship.net`, `launch2.spaceship.net` → реєстратор **Spaceship** |
| `koztechie.fyi` A | `34.216.117.25`, `54.149.79.189` — **старий сервер** (openresty/1.31, AWS), HTTP 200, **HTTPS не відповідає** |
| `koztechie.pp.ua` | вже відповідає `Server: Netlify` (http→https 301) — задіяний у Netlify |
| GitHub | `github.com/koztechie/koztechie-fyi`, гілка `main`, усі коміти запушені |
| `netlify.toml` | **є в репо** (див. §1) — контент за `ARCHITECTURE.md §9` |

> **Перед стартом ЗАПИШИ ці IP** — вони знадобляться для відкату DNS:
> `34.216.117.25`, `54.149.79.189`.

---

## 1. netlify.toml (уже в репо)

```toml
[build]
  command = "npm ci --ignore-scripts && npm run build && npm run check"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
```

- Збірка включає `npm run check` — якщо чек не зелений, **деплой не відбудеться**
  (сайт лишається на попередньому релізі). Це навмисний гейт.
- `publish = "dist"` — Netlify публікує саме `dist/` (після passthrough `_headers`,
  `robots.txt`, шрифтів, зображень).
- Локальна перевірка цієї команди вже пройдена (2026-11-07).

---

## 2. Сайт у Netlify

1. Увійти: <https://app.netlify.com> (найзручніше — реєстрація через GitHub:
   той самий акаунт, що володіє репозиторієм).
2. **Add new site → Import from Git → GitHub** → встановити Netlify GitHub App
   (Select only this repo → `koztechie/koztechie-fyi`) → **Connect**.
3. Панель заповнить налаштування з `netlify.toml`. Перевірити САМЕ:
   - Production branch: `main`
   - Build command: `npm ci --ignore-scripts && npm run build && npm run check`
   - Publish directory: `dist`
   - `NODE_VERSION = "22"` (підхопиться з `netlify.toml`)
4. **Deploy site** → у лозі побачиш три кроки: `npm ci` → `build` → `check`.
   Останній рядок має бути `РЕЗУЛЬТАТ: все чисто`.
5. Скопіювати **тимчасовий URL сайту**: `https://<ваш-унікальний-сабдомен>.netlify.app`
   — він знадобиться для CNAME у кроці4.

**Якщо збірка впала:** див. лог останнього кроку; виправити локально
(`npm run build && npm run check`), запушити — Netlify перезбере автоматично.

---

## 3. Домен у Netlify

1. **Site configuration → Domain management → Add custom domain** →
   ввести `koztechie.fyi` → Verify (якщо Netlify попросить запис підтвердження —
   TXT-запис у Spaceship з панелі Netlify).
2. Після додавання Netlify покаже **точні DNS-записи для цього домену**.
   Далі — копіювати ЇХ із панелі, не з цього документа (IP/імена можуть змінюватися).

---

## 4. DNS у Spaceship (реєстратор)

1. Увійти в аккаунт Spaceship → керування `koztechie.fyi` → розділ **DNS**.
   Перевірити, що NS саме `launch1.spaceship.net` / `launch2.spaceship.net`
   (якщо ні — встановити їх спершу, бо без правильних NS записи не працюють).
2. **Створити нові записи** (за даними панелі Netlify):
   - `koztechie.fyi` (apex): якщо Spaceship пропонує **ALIAS/ANAME** → направити
     на `<ваш-сабдомен>.netlify.app`; якщо типу ALIAS немає → **A-записи**, які
     показав Netlify (звичайно два IPv4).
   - `www.koztechie.fyi` → **CNAME** → `<ваш-сабдомен>.netlify.app`.
3. **Видалити старі A-записи** `34.216.117.25` і `54.149.79.189` — інакше частина
   трафіку піде на старий сервер.
4. На період міграції поставити мінімальний TTL (300 с), після успіху — підняти.

---

## 5. HTTPS

1. Дочекатися в Domain management статусу **DNS validated**.
2. **Site configuration → HTTPS → Provision certificate** (Let's Encrypt,
   автоматично) → статус **Certificate issued**. Звичайно 10–30 хв після DNS.
3. Увімкнути **Force HTTPS redirect** — **ПІСЛЯ** видачі сертифіката
   (раніше можна «приклеїти» неробочий HTTPS у кеш браузерів).
4. HSTS уже відправляється сайтом (`static/root/_headers`:
   `max-age=31536000; includeSubDomains`, без `preload`) — він активується сам,
   щойно HTTPS стане робочим. Окремо нічого налаштовувати не треба.

---

## 6. Верифікація (чек-лист із очікуваними відповідями)

```bash
# DNS дивиться на Netlify, а не на старий сервер
dig +short A koztechie.fyi        # → IP з панелі Netlify (не 34.216… / 54.149…)
dig +short CNAME www.koztechie.fyi # → <ваш-сабдомен>.netlify.app

# HTTPS і редиректи
curl -sI https://koztechie.fyi/ | head -3   # → HTTP/2 200 … server: Netlify
curl -sI http://koztechie.fyi/              # → 301 Location: https://koztechie.fyi/
curl -sI https://www.koztechie.fyi/         # → 200 (або 301 на apex — консистентно)

# Заголовки з _headers (крок 160 плану)
curl -sI https://koztechie.fyi/ | grep -i x-robots-tag   # → noai, noimageai
curl -sI https://koztechie.fyi/ | grep -i strict-transport # → max-age=31536000

# Контент
curl -s https://koztechie.fyi/robots.txt | grep Sitemap   # → Sitemap: https://koztechie.fyi/sitemap.xml
curl -sI https://koztechie.fyi/feed.xml | head -1         # → 200
```

Браузером (Chrome + Firefox, `environment.md §4`):

1. Головна: паспорт (`Оновлено · <сьогоднішня дата>`), розділи, останній запис.
2. Мовний перемикач УКР/ENG на всіх сторінках.
3. `/blog/`, `/manifest/`, `/privacy/`, `/cemetery/`, `/now/`, `/colophon/`,
   `/contact/`, `/nichlyst/`, `/poetry/`, `/practice/` — без помилок404.
4. `https://koztechie.fyi/несноіснє-нічого` → сторінка 404 (не хост-помилка).
5. Шрифти: `curl -sI https://koztechie.fyi/fonts/IBMPlexMono-Regular-subset.woff2`
   → 200.

**Canonical і hreflang уже вказують на `https://koztechie.fyi/`** — після
успіху вони стають правдою (до міграції вони посилалися на домен із мертвим
HTTPS — це ще одна причина виконати крок саме зараз).

---

## 7. Відкат (антикрихкість)

| Ситуація | Дія |
|----------|-----|
| Щось зламалося **ДО** зміни DNS | Нічого не зламано: старий сервер (`34.216.117.25`, `54.149.79.189`) досі працює. Виправити й повторити. |
| Щось зламалося **ПІСЛЯ** зміни DNS | Spaceship → DNS → **повернути записані старі A-записи** назад. Трафік повернеться на openresty за TTL (мінімальний TTL = хвилини). |
| Поганий контент на Netlify | Netlify → **Site configuration → Deploys** → вибрати останній робочий деплой → **Publish deploy** (відкат за секунди, без DNS). |
| Сертифікат не видається | Force HTTPS лишити ВИМКНЕНИМ; HTTPS на `koztechie.fyi` просто не працюватиме, HTTP — працюватиме (як зараз). Не видаляти домен із Netlify. |

**Не робити до успіху:** видаляти сайт у Netlify, змінювати NS у Spaceship
(лишати `launch1/launch2.spaceship.net` — записи працюють при них), вимикати
старий AWS-сервер.

---

## 8. Старий сервер

Після повної верифікації (§6): трафік уже піде на Netlify — старий
openresty-сервер (`34.216.117.25`, `54.149.79.189`) слід вимкнути/звільнити,
щоб лишився один відповідач. Що це за інстанс (його пароль/панель) — поза
доступом ШІ; дії залежать від того, де він був створений.

---

## 9. Далі за планом (НЕ частина цього кроку)

- **158.** `koztechie.pp.ua` → alias 301 на основний домен (Netlify: Domain
  management → Add alias). Тримати `.pp.ua`, поки `.fyi` не проіндексований.
  Примітка: `pp.ua` уже відповідає через Netlify (http→https 301) — крок
  полягає в перенаправленні на основний домен.
- **159.** Перевірити ВСІ редиректи саме як **301** (не 302).
- **160–161.** Заголовки безпеки та CSP — уже в `static/root/_headers`
  (`X-Robots-Tag`, HSTS, CSP `frame-ancestors 'none'`, `default-src 'self'`).
  Перевірити в кроці6 після міграції.
