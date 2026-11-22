function block(source, start, end) {
  const startAt = source.search(start);
  if (startAt < 0) return "";
  const tail = source.slice(startAt);
  const endAt = tail.slice(1).search(end);
  return endAt < 0 ? tail : tail.slice(0, endAt + 1);
}

export function auditDesignMetaphor({
  decisions = "",
  agents = "",
  designSystem = "",
  state = "",
  wireframes = [],
}) {
  const errors = [];
  const require = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const section16 = block(decisions, /^### 1\.6\./m, /^### 1\.7\./m);
  const section9 = block(decisions, /^## 9\./m, /^## 10\./m);
  const section185 = block(decisions, /^### 18\.5\./m, /^## 19\./m);
  const homeRow = decisions.match(/^\|\s*1\s*\|\s*`\/`[^\n]*/m)?.[0] ?? "";
  const designDirection = block(designSystem, /^## 1\./m, /^## 2\./m);
  const designConcept = block(designSystem, /^### Межі концепції$/m, /^## 2\./m);

  require(
    /Відвідувач — читач, який сам обирає маршрут/.test(section16) &&
      /не візуальна метафора/.test(section16),
    "DECISIONS §1.6 має визначати читача як модель взаємодії, не артдирекцію"
  );
  require(
    /цифровий вузол записів, видимий через відкритий індекс/i.test(section9) &&
      !/сайт\s*=\s*книг|книга має кінці/i.test(section9),
    "DECISIONS §9 має узгоджувати структуру вузла з відкритим індексом, не книжковою композицією"
  );
  require(
    /покажчик розділів/i.test(homeRow) &&
      !/книг|обкладин|папер|картотек/i.test(homeRow),
    "рядок головної в DECISIONS §4 не має задавати предметну стилізацію"
  );
  require(
    !/книга не має|книжков/i.test(section185),
    "DECISIONS §18.5 не має обґрунтовувати структуру метафорою книги"
  );
  require(
    /не імітуй також книгу, обкладинку чи матеріальний папір/i.test(designDirection) &&
      /`--paper` — тільки семантичний токен кольору/i.test(designDirection) &&
      /Книга,?\s*\n?обкладинка/i.test(designConcept),
    "design-system має прямо забороняти фізичну метафору й відрізняти її від токена --paper"
  );
  require(
    /відкритим індексом/i.test(agents) &&
      /це семантика, не артдирекція/i.test(agents) &&
      /DECISIONS\.md` §43\.17/i.test(agents),
    "AGENTS.md має передавати чинний концепт і посилатися на його ADR"
  );
  require(
    /\|\s*2026-11-22\s*\|\s*R3\.6 \/ concept reconciliation\s*\|/.test(state),
    "STATE.md має позначати попередній рядок про книгу як історичний і фіксувати R3.6"
  );
  require(
    wireframes.length > 0 &&
      wireframes.every(({ path, source }) =>
        /ІСТОРИЧНИЙ ЕСКІЗ, НЕ ЧИННИЙ РЕФЕРЕНС/.test(source) &&
        /docs\/design-system\.md/.test(source)
      ),
    "усі старі wireframe-и мають явно посилатися на чинну дизайн-систему як єдиний референс"
  );

  return errors;
}
