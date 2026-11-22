const actionClass = /(?:^|[\s_-])(?:cta|button|action)(?:$|[\s_-])/i;

export function auditHomeContactHierarchy(html, lang) {
  const errors = [];
  const hero = html.match(/<header class="home-hero">([\s\S]*?)<\/header>/)?.[1];
  if (!hero) return ["герой головної не знайдено"];

  const lead = hero.match(/<p class="home-lead">[\s\S]*?<\/p>/)?.[0];
  if (!lead) errors.push("лід героя не знайдено");
  if (/<button\b|role="button"/i.test(hero)) {
    errors.push("у герої є керування з роллю кнопки");
  }

  const heroRemainder = lead ? hero.replace(lead, "") : hero;
  if (/<a\b|<button\b|role="button"/i.test(heroRemainder)) {
    errors.push("у герої є окреме посилання/керування поза текстом ліда");
  }

  const heroClasses = [...hero.matchAll(/\bclass="([^"]*)"/g)]
    .flatMap((match) => match[1].split(/\s+/));
  if (heroClasses.some((name) => actionClass.test(name))) {
    errors.push("у герої є клас, що позначає CTA, кнопку або окрему дію");
  }

  const contactPath = lang === "en" ? "/en/contact/" : "/contact/";
  const sectionIndex = html.match(/<ul class="home-sections-list"[^>]*>([\s\S]*?)<\/ul>/)?.[1];
  if (!sectionIndex?.includes(`href="${contactPath}"`)) {
    errors.push(`звичайне посилання ${contactPath} відсутнє в індексі розділів`);
  }

  return errors;
}
