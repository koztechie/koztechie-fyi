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
    ? ["Public pages", "Page budget", "Updated"]
    : ["Публічних сторінок", "Бюджет сторінки", "Оновлено"];
  if (rows.length !== expectedLabels.length) {
    errors.push("паспорт має містити рівно три відомості про сайт");
  }
  if (JSON.stringify(rows.map(([label]) => label)) !== JSON.stringify(expectedLabels)) {
    errors.push("паспорт має містити кількість сторінок, бюджет і дату оновлення");
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
