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

  // Фільтри
  eleventyConfig.addFilter("ukDate", (date) => {
    return new Intl.DateTimeFormat("uk-UA", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  });

  eleventyConfig.addFilter("readingTime", (content) => {
    const words = content.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 180));
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
