import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { auditDesignMetaphor } from "./design-metaphor-contract.mjs";

const read = (path) => readFileSync(path, "utf8");
const wireframePaths = readdirSync("docs/wireframes")
  .filter((name) => name.endsWith(".svg"))
  .map((name) => join("docs/wireframes", name));
const source = {
  decisions: read("docs/DECISIONS.md"),
  plan: read("docs/PLAN.md"),
  agents: read("AGENTS.md"),
  designSystem: read("docs/design-system.md"),
  state: read("docs/STATE.md"),
  wireframes: wireframePaths.map((path) => ({ path, source: read(path) })),
};

assert.deepEqual(auditDesignMetaphor(source), []);

const staleComposition = {
  ...source,
  decisions: source.decisions.replace(
    "цифровий вузол записів, видимий через відкритий індекс",
    "сайт = книга"
  ),
};
assert(
  auditDesignMetaphor(staleComposition).some((error) => error.includes("DECISIONS §9")),
  "гейт має відхиляти повернення книжкової композиції в чинне рішення"
);

const staleCover = {
  ...source,
  decisions: source.decisions.replace(
    "Вхід до вузла: теза, коротке пояснення, покажчик розділів і останні записи.",
    "Обкладинка книги."
  ),
};
assert(
  auditDesignMetaphor(staleCover).some((error) => error.includes("рядок головної")),
  "гейт має відхиляти повернення обкладинки книги в sitemap"
);

const physicalToken = {
  ...source,
  designSystem: source.designSystem.replace(
    "`--paper` — тільки семантичний токен кольору світлого поля",
    "`--paper` імітує паперову поверхню"
  ),
};
assert(
  auditDesignMetaphor(physicalToken).some((error) => error.includes("токена --paper")),
  "гейт має відхиляти матеріальне трактування токена --paper"
);

const activeWireframe = {
  ...source,
  wireframes: source.wireframes.map((item, index) =>
    index === 0
      ? { ...item, source: item.source.replace(/.*ІСТОРИЧНИЙ ЕСКІЗ.*\n/, "") }
      : item
  ),
};
assert(
  auditDesignMetaphor(activeWireframe).some((error) => error.includes("wireframe-и")),
  "гейт має відхиляти старий wireframe без позначки архівного статусу"
);

console.log("✅ design-metaphor drill: єдину модель прийнято; повернення старої візуальної метафори відхилено.");
