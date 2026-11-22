export function auditActiveNav({ template = "", css = "", html = "" }) {
  const errors = [];
  const require = (ok, message) => {
    if (!ok) errors.push(message);
  };

  require(template.includes('aria-current="page"')
    && template.includes('class="site-nav__label"'),
  "шаблон має позначати поточний пункт і виділяти його назву");
  require(/\.site-nav a\[aria-current="page"\]\s+\.site-nav__label\s*\{[^}]*background:\s*var\(--accent-night\)/s.test(css),
    "активна назва має контрастне акцентне тло");
  require(/\.site-nav a\[aria-current="page"\]\s+\.site-nav__label\s*\{[^}]*font:\s*[^;]*var\(--font-mono\)/s.test(css),
    "активна назва має бути моноширинною");
  require(/\.site-nav a\[aria-current="page"\]\s+\.site-nav__label::before\s*\{[^}]*content:\s*"\[\s*"/s.test(css)
    && /\.site-nav a\[aria-current="page"\]\s+\.site-nav__label::after\s*\{[^}]*content:\s*"\s*\]"/s.test(css),
  "активна назва має видимі квадратні дужки");
  require(/\.site-nav a\[aria-current="page"\]\s+\.site-nav__label\s*\{[^}]*color:\s*var\(--night\)/s.test(css),
    "текст активної назви має контрастувати з акцентним тлом");

  if (html) {
    const nav = html.match(/<nav\b[^>]*class="site-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
    const current = [...nav.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)]
      .filter(([, attrs]) => /\baria-current="page"/.test(attrs));
    require(current.length === 1, "у розділі має бути рівно один активний пункт");
    if (current.length === 1) {
      require(/class="site-nav__label"/.test(current[0][2]),
        "активний пункт має містити стилізовану назву");
    }
  }
  return errors;
}
