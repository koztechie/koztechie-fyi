# Відновлення з нуля — A4 (PLAN 165)

Друк на один аркуш. Від порожньої машини до живого сайту. Деталі: `deploy.md` §6, `runbook.md`.

## 1. Вхід

- Менеджер паролів: доступи GitHub і Netlify (2FA-коди окремо).
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
3. **DNS-провайдер:** Netlify DNS (NS1), зони `koztechie.fyi` і
   `koztechie.pp.ua`. Перед будь-якою зміною **експортувати саме всю змінювану
   зону** з Netlify DNS і зберегти архів поза git із датою; якщо експорту немає
   — зберегти повний список записів. Для `.pp.ua` очікувані NS —
   `dns1.p04.nsone.net`–`dns4.p04.nsone.net`.
4. Перевірити авторитетні NS:

   ```bash
   dig NS koztechie.fyi +noall +answer
   # очікувано: dns1.p07.nsone.net., dns2.p07.nsone.net.,
   #            dns3.p07.nsone.net., dns4.p07.nsone.net.
   ```

5. Не переносити DNS до Spaceship і не підміняти записи шаблонними IP.
   Тип `www` перевірити фактично; поточний тип — **A**.
6. **HTTPS:** Let's Encrypt ~10 хв (до 24 год) + Force HTTPS.

## 4. Верифікація

```bash
dig NS koztechie.fyi +noall +answer
dig SOA koztechie.fyi +noall +answer
dig A koztechie.fyi +noall +answer          # IP не хардкодити: зафіксувати відповідь під час відновлення
dig A www.koztechie.fyi +noall +answer      # www зараз має тип A; перевіряти заново
IP="$(dig +short A koztechie.fyi | head -n1)"
curl -sI https://koztechie.fyi/ --resolve "koztechie.fyi:443:${IP}" | head -1 # DNS-незалежний HTTP
curl -sI https://koztechie.fyi/ | head -1   # → HTTP/2 200
curl -s https://koztechie.fyi/ | grep -o '<h1[^>]*>[^<]*</h1>'
```

`curl --resolve` під'єднується напряму до A-IP, але зберігає hostname/SNI та
перевірку сертифіката. A-відповіді залежать від географії; еталон — делегування
на Netlify DNS (`dns*.p07.nsone.net`), чинна Netlify-ціль apex-запису та HTTP 200,
не незмінний список IP.

**G-13 — щоквартальний дрил відновлення:** перед перевіркою DNS експортувати
зону, виконати `dig NS` і `dig SOA`, а потім звірити провайдера: NS мають
належати Netlify DNS/NS1 (`*.nsone.net`), а MNAME у SOA — також NS1
(`dns1.p01.nsone.net.`). Розбіжність означає зупинку дрилу та перевірку
делегування; не змінювати записи навмання.

Повний чек-лист — `deploy.md §6`; браузер — `environment.md §4`.

## 5. Аварії

Падіння → `runbook.md` (триаж → гілки A–E → відкат). Netlify →
<https://www.netlifystatus.com>. Інциденти — у `docs/STATE.md`.
