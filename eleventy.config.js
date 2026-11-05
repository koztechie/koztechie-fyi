export default function (eleventyConfig) {
  // Passthrough. Явні мапи: input = "." → прості шляхи зберігали б структуру
  // (src/styles → dist/src/styles), але розмітка шукає /styles/, /fonts/, /img/.
  eleventyConfig.addPassthroughCopy({"static/root": "/"});
  eleventyConfig.addPassthroughCopy({"static/fonts": "fonts"});
  eleventyConfig.addPassthroughCopy({"static/img": "img"});
  eleventyConfig.addPassthroughCopy({"src/styles": "styles"});
  eleventyConfig.addPassthroughCopy({"static/og": "og"});

  // Мови фідів (крок 125): два виходи /feed.xml та /en/feed.xml
  eleventyConfig.addGlobalData("feedLangs", ["uk", "en"]);

  // Колекції
  eleventyConfig.addCollection("blog", (api) =>
    api.getFilteredByGlob("content/*/blog/*.md").sort((a, b) => b.data.date - a.data.date)
  );
  eleventyConfig.addCollection("practice", (api) =>
    api.getFilteredByGlob("content/*/practice/*.md").sort((a, b) => b.data.date - a.data.date)
  );
  eleventyConfig.addCollection("cemetery", (api) =>
    api.getFilteredByGlob("content/*/cemetery/*.md").sort((a, b) => b.data.date - a.data.date)
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

  // Множина для лічильника (крок 118): uk — 3 форми, en — 2.
  // Визначення мови — за довжиною масиву форм у словнику.
  eleventyConfig.addFilter("plural", (n, forms) => {
    if (!Array.isArray(forms) || forms.length === 0) return "";
    const num = Math.abs(Number(n)) || 0;
    if (forms.length === 2) {
      // en: entry / entries
      return num === 1 ? forms[0] : forms[1];
    }
    // uk: запис / запису / записів
    const m10 = num % 10;
    const m100 = num % 100;
    if (m10 === 1 && m100 !== 11) return forms[0];
    if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return forms[1];
    return forms[2];
  });

  // Пошук сторінки за URL (перемикач мов: дзеркало або заглушка, крок 111)
  eleventyConfig.addFilter("findByUrl", (pages, url) =>
    (pages || []).find((p) => p.url === url)
  );

  // JSON для JSON-LD (крок 151). autoescape njk ламає лапки — у парі з | safe.
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v));

  // ISO 8601 для sitemap <lastmod> (DECISIONS.md §17.4, §20).
  // Приймає Date або ISO-рядок (updated з YAML часто лишається рядком).
  eleventyConfig.addFilter("isoDate", (value) => {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  });

  // Дата по-англійськи для паспорта en (дзеркало ukDate, спек 2026-11-05):
  // "26 October 2026". uk-варіант лишається канонічним для uk-сторінок.
  eleventyConfig.addFilter("enDate", (date) => {
    if (!date) return "";
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
  });

  // RFC 822 для RSS <pubDate> (DECISIONS.md §30.4).
  // toUTCString() → «Fri, 16 Oct 2026 00:00:00 GMT» — валідний RFC 1123/822
  // з англійськими токенами (локалізовані дні ламають валідацію фідів, крок 126).
  eleventyConfig.addFilter("rfc822Date", (value) => {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toUTCString();
  });

  // Спаджений за датою для RSS (крок 125): новіші першими.
  eleventyConfig.addFilter("sortByDateDesc", (items) => {
    const toTime = (v) => (v instanceof Date ? v.getTime() : v ? new Date(v).getTime() : 0);
    return [...(items || [])].sort((a, b) => toTime(b.data?.date) - toTime(a.data?.date));
  });

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
