function declarations(source, selector) {
  const rules = [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  return rules
    .filter(([, selectors]) => selectors.split(",").some((item) => item.trim() === selector))
    .map(([, , body]) => body)
    .join("\n");
}

export function auditPageExperience({
  layout = "",
  components = "",
  home = "",
  list = "",
  post = "",
  practice = "",
  cemetery = "",
  poetry = "",
  page = "",
  now = "",
  project = "",
  stub = "",
  notFound = "",
}) {
  const errors = [];
  const require = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const has = (source, pattern) => pattern.test(source);
  const mobileStart = layout.indexOf("@media (max-width: 42rem)");
  const mobile = mobileStart < 0 ? "" : layout.slice(mobileStart);

  require(
    has(home, /home-opening[\s\S]*home-panel--passport[\s\S]*home-panel--principles[\s\S]*home-panel--sections[\s\S]*home-panel--latest[\s\S]*home-panel--nichlyst/) &&
      has(layout, /\.home-hero h1\s*\{/) &&
      has(layout, /\.home-panel--passport\s*\{/),
    "головна має зберігати орієнтацію, паспорт та відмінний ритм розділів"
  );
  const homeHeadingRules = [
    ...layout.matchAll(/\.home-hero h1\s*\{([^{}]*)\}/g),
  ].map(([, body]) => body);
  require(
    homeHeadingRules.length > 0 &&
      /width:\s*min\(100%,\s*48rem\)/.test(homeHeadingRules[0]) &&
      /text-wrap:\s*balance/.test(homeHeadingRules[0]) &&
      /overflow-wrap:\s*normal/.test(homeHeadingRules[0]) &&
      /hyphens:\s*auto/.test(homeHeadingRules[0]) &&
      !homeHeadingRules.some((body) =>
        /(?:max-width|width):\s*[\d.]+ch\b|overflow-wrap:\s*anywhere/.test(body)
      ),
    "H1 головної має балансувати цілі слова в адаптивному полі, без вузької ch-ширини й довільних розривів"
  );

  require(
    has(list, /index-entry__facts/) &&
      has(layout, /\.list--poetry \.index-entry__body > a\s*\{/) &&
      has(layout, /\.list--cemetery \.index-entry__summary\s*\{/) &&
      has(layout, /\.list--practice \.list-body ul\s*\{/),
    "чотири індекси мають лишатися різними за режимом сканування й даними"
  );

  require(
    has(post, /class="entry-body"/) &&
      /max-width:\s*var\(--measure\)/.test(declarations(layout, ".entry-body")),
    "допис має зберігати вузьке поле зосередженого читання"
  );

  require(
    has(practice, /class="entry-body case-body"/) &&
      /counter-increment:\s*case-section/.test(declarations(layout, ".case-body h2::before")),
    "кейс має показувати перевірювану послідовність секцій"
  );

  require(
    has(cemetery, /closed-record-facts[\s\S]*closed-record-epitaph/) &&
      has(layout, /\.closed-record-facts\s*\{/) &&
      /grid-column:\s*2/.test(declarations(layout, ".closed-record-header > .entry-line")) &&
      /font:\s*italic/.test(declarations(layout, ".closed-record-epitaph")),
    "запис Кладовища має відрізняти факти завершення від голосу епітафії, не стискаючи статус у маргіналію"
  );

  require(
    has(poetry, /class="poem-body entry-body poetry"/) &&
      /line-height:\s*1\.8/.test(declarations(components, ".entry-body.poetry")) &&
      /white-space:\s*pre-wrap/.test(declarations(components, ".entry-body.poetry")),
    "вірш має зберігати окремий ритм рядків і строф"
  );

  require(
    has(page, /class="page page--/) &&
      /max-width:\s*var\(--measure\)/.test(declarations(layout, ".page-body")) &&
      /grid-column:\s*2/.test(declarations(layout, ".page-updated")),
    "довідкова сторінка має тримати читальне поле окремо, а дату — не ламати у вузькій маргіналії"
  );
  require(
    /grid-column:\s*1/.test(declarations(mobile, ".page-header h1")) &&
      /grid-column:\s*1/.test(declarations(mobile, ".page-header .page-updated")) &&
      /grid-column:\s*1/.test(declarations(mobile, ".entry-header .entry-meta")) &&
      /grid-column:\s*1/.test(declarations(mobile, ".entry-header .content-warning")) &&
      /grid-column:\s*1/.test(declarations(mobile, ".closed-record-header > h1")) &&
      /grid-column:\s*1/.test(declarations(mobile, ".closed-record-header > .entry-line")) &&
      /grid-column:\s*1/.test(declarations(mobile, ".closed-record-epitaph")),
    "одноколонковий reflow має скидати специфічні desktop-колонки заголовків і метаданих"
  );

  require(
    has(now, /class="now-season"/) &&
      has(now, /class="now-work-list"/) &&
      has(layout, /\.page--now \.now-season\s*\{/),
    "сторінка стану має ставити актуальність перед переліком робіт"
  );

  require(
    has(project, /class="project-page project-page--nichlyst"/) &&
      has(components, /\.nichlyst-gallery\s*\{/) &&
      has(components, /\.nichlyst-facts\s*\{/),
    "NICHLYST має зберігати окремий проєктний режим з медіа та фактами"
  );

  require(
    has(stub, /translation-pending/) &&
      has(notFound, /error-record/) &&
      has(layout, /\.translation-pending__link\s*\{/) &&
      has(layout, /\.error-record__links\s*\{/),
    "заглушка й 404 мають пояснювати відсутність та давати шлях далі"
  );

  return errors;
}
