function rule(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
}

export function auditCompositionSignature({
  core = "",
  layout = "",
  components = "",
  post = "",
  poetry = "",
  practice = "",
}) {
  const errors = [];
  const require = (condition, message) => {
    if (!condition) errors.push(message);
  };

  require(/--serial-rail\s*:/.test(core), "немає спільної ширини нумераційної маргіналії");
  require(/--serial-gap\s*:/.test(core), "немає спільного відступу маргіналії");
  require(/--serial-mark\s*:/.test(core), "немає спільного масштабу номерів");

  for (const selector of [
    ".entry",
    ".poem-record",
    ".page",
    ".index-list > li",
    ".home-principles li",
    ".home-sections-list li",
    ".archive-list li",
  ]) {
    const declarations = rule(layout, selector);
    require(
      /var\(--serial-rail\)/.test(declarations),
      `${selector} не вирівняний зі спільною нумераційною маргіналією`
    );
    require(
      /var\(--serial-gap\)/.test(declarations),
      `${selector} не використовує спільний відступ нумераційної маргіналії`
    );
  }
  for (const selector of [
    ".home-principles .num",
    ".home-sections-list li::before",
    ".archive-list .index-entry__number",
    ".index-entry__number",
  ]) {
    require(
      /var\(--serial-mark\)/.test(rule(layout, selector)),
      `${selector} не використовує впізнаваний масштаб серійного номера`
    );
  }
  require(
    /var\(--serial-mark\)/.test(rule(components, ".entry-line__number")),
    "номер запису не має спільної типографічної сигнатури"
  );
  for (const [name, source] of [["post", post], ["poetry", poetry], ["practice", practice]]) {
    require(
      /class="entry-line__label"[\s\S]*?class="entry-line__number"/.test(source),
      `${name}.njk не відокремлює тип запису від великого серійного номера`
    );
  }
  return errors;
}
