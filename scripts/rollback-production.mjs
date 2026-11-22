#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const siteId = process.env.NETLIFY_SITE_ID;
const token = process.env.NETLIFY_AUTH_TOKEN;
const currentDeployId = process.env.CURRENT_DEPLOY_ID;

if (!siteId || !currentDeployId) {
  console.error(
    "❌ Rollback потребує NETLIFY_SITE_ID і CURRENT_DEPLOY_ID",
  );
  process.exit(1);
}

const cli = ["--prefix", "scripts/tools", "netlify", "api"];
const auth = token ? ["--auth", token] : [];
const deploysRaw = execFileSync(
  "npx",
  [
    ...cli,
    "listSiteDeploys",
    "--data",
    JSON.stringify({ site_id: siteId, per_page: 100 }),
    ...auth,
  ],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);

let deploys;
try {
  deploys = JSON.parse(deploysRaw);
} catch {
  console.error("❌ listSiteDeploys повернув некоректний JSON; rollback зупинено");
  process.exit(1);
}

if (!Array.isArray(deploys)) {
  console.error("❌ listSiteDeploys не повернув список деплоїв; rollback зупинено");
  process.exit(1);
}

const previous = deploys.find(
  (deploy) =>
    deploy.state === "ready" &&
    deploy.context === "production" &&
    deploy.site_id === siteId &&
    deploy.id !== currentDeployId,
);

if (!previous?.id) {
  console.error("❌ Не знайдено попередній ready production deploy; rollback зупинено");
  process.exit(1);
}

console.error(`↩️ Відновлюю попередній production deploy ${previous.id}`);
execFileSync(
  "npx",
  [
    ...cli,
    "restoreSiteDeploy",
    "--data",
    JSON.stringify({ site_id: siteId, deploy_id: previous.id }),
    ...auth,
  ],
  { stdio: "inherit" },
);
execFileSync("npm", ["run", "live-probe:light"], {
  stdio: "inherit",
  env: {
    ...process.env,
    EXPECTED_COMMIT_SHA: "",
    LIVE_PROBE_PREVIOUS_CSS: "",
    LIVE_PROBE_ALLOW_LEGACY_PROVENANCE: "1",
  },
});
