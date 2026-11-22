function textOf(markup = "") {
  return markup.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function auditHomeConcept(html, lang) {
  const errors = [];
  const conceptMatch = html.match(/<p class="home-concept">([\s\S]*?)<\/p>/);
  const leadMatch = html.match(/<p class="home-lead">([\s\S]*?)<\/p>/);
  const concept = textOf(conceptMatch?.[1]);
  const lead = textOf(leadMatch?.[1]);

  if (!conceptMatch) errors.push("контекстне пояснення ВУЗОЛ-0 відсутнє");
  if (!leadMatch) errors.push("пояснення індексної моделі відсутнє");

  const requirements = lang === "en"
    ? [
        [/\bVUZOL-0\b/, "кодова назва"],
        [/internal name/i, "внутрішня назва"],
        [/digital node/i, "цифровий вузол"],
        [/records and testimony/i, "записи й свідчення"],
      ]
    : [
        [/ВУЗОЛ-0/, "кодова назва"],
        [/внутрішня назва/i, "внутрішня назва"],
        [/цифров(?:ого|ий) вузл/i, "цифровий вузол"],
        [/записів і свідчень/i, "записи й свідчення"],
      ];
  for (const [pattern, label] of requirements) {
    if (!pattern.test(concept)) errors.push(`у поясненні концепції немає ознаки «${label}»`);
  }

  const mechanics = lang === "en"
    ? [
        [/sections/i, "розділи"],
        [/numbered indexes/i, "нумеровані індекси"],
        [/preserv/i, "збереження"],
        [/keep readers scrolling/i, "відмова від утримання уваги"],
      ]
    : [
        [/розділ/i, "розділи"],
        [/нумерован(?:і|их) індекс/i, "нумеровані індекси"],
        [/збереженн/i, "збереження"],
        [/утриманн[яі] уваги/i, "відмова від утримання уваги"],
      ];
  for (const [pattern, label] of mechanics) {
    if (!pattern.test(lead)) errors.push(`лід не пояснює механіку «${label}»`);
  }

  const title = textOf(html.match(/<title>([\s\S]*?)<\/title>/)?.[1]);
  const logo = textOf(html.match(/<a class="site-logo"[^>]*>([\s\S]*?)<\/a>/)?.[1]);
  if (/ВУЗОЛ-0|VUZOL-0/i.test(`${title} ${logo}`)) {
    errors.push("кодова назва використана замість публічного бренду в title або шапці");
  }
  return errors;
}
