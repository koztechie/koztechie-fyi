export default {
  lang: "en",
  layout: "case.njk",
  eleventyComputed: {
    permalink: (data) => {
      // Чернетки не генеруються (content-model §7.6: «Зніми draft: true»).
      if (data.draft === true) return false;
      // Явний permalink у front matter має пріоритет (індекси, пагінація).
      if (data.permalink) return data.permalink;
      const stem = data.page?.filePathStem || "";
      if (stem.endsWith("/index")) return "/en/practice/";
      return "/en/practice/" + data.page.fileSlug + "/";
    },
  },
};
