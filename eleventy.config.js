export default function (eleventyConfig) {
  // Passthrough
  eleventyConfig.addPassthroughCopy({"static/root": "/"});
  eleventyConfig.addPassthroughCopy("static/fonts");
  eleventyConfig.addPassthroughCopy("static/img");
  eleventyConfig.addPassthroughCopy("src/styles");

  // Колекції
  eleventyConfig.addCollection("blog", (api) =>
    api.getFilteredByGlob("content/*/blog/*.md").sort((a, b) => b.data.date - a.data.date)
  );
  eleventyConfig.addCollection("practice", (api) =>
    api.getFilteredByGlob("content/*/practice/*.md").sort((a, b) => b.data.date - a.data.date)
  );
  eleventyConfig.addCollection("graveyard", (api) =>
    api.getFilteredByGlob("content/*/graveyard/*.md").sort((a, b) => b.data.date - a.data.date)
  );
  eleventyConfig.addCollection("poetry", (api) =>
    api.getFilteredByGlob("content/*/poetry/*.md").sort((a, b) => b.data.entry - a.data.entry)
  );

  // Мовні колекції (крок 117): контент за мовою для sitemap/RSS/hreflang.
  // Спаджений за датою спадно; сторінки без дати — в кінець.
  const byDateDesc = (a, b) => {
    const da = a.data.date ? new Date(a.data.date).getTime() : 0;
    const db = b.data.date ? new Date(b.data.date).getTime() : 0;
    return db - da;
  };
  eleventyConfig.addCollection("uk", (api) =>
    api.getFilteredByGlob("content/uk/**/*").sort(byDateDesc)
  );
  eleventyConfig.addCollection("en", (api) =>
    api.getFilteredByGlob("content/en/**/*").sort(byDateDesc)
  );

  // Фільтри
  eleventyConfig.addFilter("ukDate", (date) => {
    // TECH_STANDARDS §9: Intl для uk-UA додає «р.». Прибираємо через formatToParts.
    const parts = new Intl.DateTimeFormat("uk-UA", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).formatToParts(date);
    return parts
      .filter((p) => !(p.type === "literal" && p.value.includes("р")))
      .map((p) => p.value)
      .join("");
  });

  eleventyConfig.addFilter("readingTime", (content) => {
    // 180 слів/хв (TECH_STANDARDS §9). Теги не рахуються.
    const text = String(content || "").replace(/<[^>]+>/g, " ");
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 180));
  });

  // Буквиця: шаблон перевіряє перший символ (design-system.md §5.11.4).
  // Літера — так; цифра, лапка, тире, список — ні.
  eleventyConfig.addFilter("dropcapReady", (html) => {
    const m = String(html || "").match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (!m) return false;
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (!text) return false;
    return /^[a-zа-яіїєґ']/i.test(text);
  });

  // Пошук сторінки за URL (перемикач мов: дзеркало або заглушка, крок 111)
  eleventyConfig.addFilter("findByUrl", (pages, url) =>
    (pages || []).find((p) => p.url === url)
  );

  // Конфіг
  return {
    dir: {
      input: ".",
      includes: "src/templates",
      data: "src/_data",
      output: "dist",
    },
    templateFormats: ["md", "njk"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
