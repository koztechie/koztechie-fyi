#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";

const snapshot = "dist2";
const buildEnv = {
  ...process.env,
  SOURCE_DATE_EPOCH:
    process.env.SOURCE_DATE_EPOCH ||
    execFileSync("git", ["log", "-1", "--pretty=%ct"], { encoding: "utf8" }).trim(),
};

try {
  if (existsSync(snapshot)) rmSync(snapshot, { recursive: true, force: true });
  execFileSync("npm", ["run", "build"], { stdio: "inherit", env: buildEnv });
  cpSync("dist", snapshot, { recursive: true });
  execFileSync("npm", ["run", "build"], { stdio: "inherit", env: buildEnv });
  execFileSync("diff", ["-r", "dist", snapshot], { stdio: "inherit" });
  console.log("determinism: два послідовні build дають ідентичний dist");
} finally {
  if (existsSync(snapshot)) rmSync(snapshot, { recursive: true, force: true });
}
