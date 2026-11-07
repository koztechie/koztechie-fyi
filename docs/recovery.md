# Відновлення з нуля — A4 (PLAN 165)

Друк на один аркуш. Від порожньої машини до живого сайту. Деталі: `deploy.md` §6, `runbook.md`.

## 1. Вхід

- Менеджер паролів: доступи GitHub, Netlify, Spaceship (2FA-коди окремо).
- Бекапи поза git (PLAN 9): `red-lines.md`, `DEATH.md` — шифрований архів.
- `git`, Node **22**, npm. Єдина залежність — Eleventy.

## 2. Збірка (перевірено 2026-11-07: 8.7 с, 0/0)

```bash
git clone https://github.com/koztechie/koztechie-fyi.git && cd koztechie-fyi
npm ci --ignore-scripts && npm run build && npm run check && npm run validate
# очікувано: «РЕЗУЛЬТАТ: все чисто» → dist/ готовий
```

## 3. Публікація

1. **Netlify:** *Add new site → Deploy manually* → `dist/` (або *Link to Git
   repository* → `koztechie/koztechie-fyi`, `main` — тоді push = автозбірка).
2. **Домени:** `koztechie.fyi` — primary; `koztechie.pp.ua` — alias 301
   (`static/root/_redirects`; видалити після індексації `.fyi`).
3. **DNS (Spaceship), зона `koztechie.fyi`:** `@` ALIAS →
   `apex-loadbalancer.netlify.com`; `www` CNAME → `koztechie.netlify.app`;
   **NS не чіпати** — `launch1/launch2.spaceship.net`.
4. **HTTPS:** Let's Encrypt ~10 хв (до 24 год) + Force HTTPS.

## 4. Верифікація

```bash
dig +short A koztechie.fyi        # → 75.2.60.5 / 99.83.231.61
curl -sI https://koztechie.fyi/ | head -1   # → HTTP/2 200
curl -s https://koztechie.fyi/ | grep -o '<h1[^>]*>[^<]*</h1>'
```

Повний чек-лист — `deploy.md §6`; браузер — `environment.md §4`.

## 5. Аварії

Падіння → `runbook.md` (триаж → гілки A–E → відкат). Netlify →
<https://www.netlifystatus.com>. Інциденти — у `docs/STATE.md`.
