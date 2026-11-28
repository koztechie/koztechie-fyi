function textOf(markup = "") {
  return markup.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function auditHomePassport(html, lang) {
  const errors = [];
  const section = html.match(
    /<section class="home-panel home-panel--passport"[^>]*>([\s\S]*?)<\/section>/
  )?.[1];
  if (!section) return ["паспорт головної відсутній"];

  const expectedTitle = lang === "en" ? "About this site" : "Про сайт";
  const heading = textOf(section.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/)?.[1]);
  if (heading !== expectedTitle) {
    errors.push("паспорт має описувати сайт, а не автора");
  }

  const rows = [...section.matchAll(/<div class="row">\s*<dt>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>\s*<\/div>/g)]
    .map((match) => [textOf(match[1]), textOf(match[2])]);
  const expectedLabels = lang === "en"
    ? ["Archive entries", "Archive last updated"]
    : ["Записів в архіві", "Останнє оновлення архіву"];
  if (rows.length !== expectedLabels.length) {
    errors.push("паспорт має містити лише лічильник записів і дату останнього оновлення архіву");
  }
  if (JSON.stringify(rows.map(([label]) => label)) !== JSON.stringify(expectedLabels)) {
    errors.push("паспорт має містити лічильник записів і називати дату останнього оновлення архіву");
  }
  if (!/^\d+$/.test(rows[0]?.[1] ?? "") || Number(rows[0]?.[1]) < 1) {
    errors.push("лічильник записів має бути додатним цілим числом");
  }

  const content = textOf(section);
  const authorOrLanguage = lang === "en"
    ? /\b(author|handle|nickname|site languages|English|Ukrainian|Eugene Kozlovsky|koztechie)\b/i
    : /автор|псевдонім|мови сайту|англійська|українська|Євгеній Козловський|koztechie/i;
  if (authorOrLanguage.test(content)) {
    errors.push("паспорт не повинен дублювати автора, псевдонім або мови");
  }
  if (/class="[^"]*\bh-card\b|class="[^"]*\bp-name\b|class="[^"]*\bp-nickname\b/.test(section)) {
    errors.push("паспорт сайту не є h-card автора");
  }

  return errors;
}

export function auditPageBudgetColophon(html, lang) {
  const errors = [];
  const expectedHeading = lang === "en" ? "Page-weight budget" : "Бюджет ваги сторінки";
  const headings = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)];
  const index = headings.findIndex((match) => textOf(match[1]) === expectedHeading);
  if (index < 0) return [`колофон має містити секцію «${expectedHeading}»`];

  const start = headings[index].index;
  const end = headings[index + 1]?.index ?? html.indexOf("</main>", start);
  const section = textOf(html.slice(start, end < 0 ? undefined : end));
  if (!/50\s*(?:KiB|КіБ)/i.test(section)) {
    errors.push("колофон має називати граничний бюджет 50 KiB");
  }
  if (!/Brotli/i.test(section) || !/\b11\b/.test(section)) {
    errors.push("колофон має вказувати Brotli та якість 11");
  }
  return errors;
}
