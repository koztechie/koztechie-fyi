function blockAt(source, start) {
  const open = source.indexOf("{", start);
  if (open < 0) return "";
  let depth = 1;
  for (let index = open + 1; index < source.length; index++) {
    if (source[index] === "{") depth++;
    if (source[index] === "}" && --depth === 0) return source.slice(open + 1, index);
  }
  return "";
}

function ruleIn(source, selector) {
  const start = source.indexOf(selector);
  return start < 0 ? "" : blockAt(source, start);
}

export function auditMobileNav({ css = "", html = "" }) {
  const errors = [];
  const require = (ok, message) => {
    if (!ok) errors.push(message);
  };
  const mobileStart = css.indexOf("@media (max-width: 72rem)");
  const mobile = mobileStart < 0 ? "" : blockAt(css, mobileStart);
  const nav = ruleIn(mobile, ".site-nav");
  const link = ruleIn(mobile, ".site-nav a");

  require(Boolean(mobile), "відсутня мобільна контрольна точка 72rem");
  require(/display:\s*flex\s*;/.test(nav), "мобільна навігація має бути одним горизонтальним flex-рядком");
  require(/min-width:\s*0\s*;/.test(nav) && /max-width:\s*100%\s*;/.test(nav),
    "прокрутка має лишатися всередині ширини шапки, не створюючи overflow сторінки");
  require(/overflow-x:\s*auto\s*;/.test(nav), "мобільна навігація має прокручуватися по горизонталі");
  require(!/flex-wrap:\s*wrap\s*;/.test(nav), "не перенось мобільні пункти меню на кілька рядків");
  require(/flex:\s*0\s+0\s+auto\s*;/.test(link), "пункти мають зберігати природну ширину в рядку");
  require(/white-space:\s*nowrap\s*;/.test(link), "назви пунктів не мають переноситися всередині горизонтального меню");
  require(!/@media\s*\(max-width:\s*(?:54|42|22)rem\)\s*\{[^}]*\.site-nav/s.test(css),
    "вужчі breakpoints не мають повертати меню до багаторядкової сітки");

  if (html) {
    const navHtml = html.match(/<nav\b[^>]*class="site-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
    const links = [...navHtml.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
    require(Boolean(navHtml), "зібрана сторінка не має site-nav");
    require(links.length === 4, `очікуються всі 4 пункти меню, знайдено ${links.length}`);
    require(links.every(([, attrs]) => !/\bhidden\b|\baria-hidden="true"/.test(attrs)),
      "пункт меню не можна приховувати");
  }
  return errors;
}
