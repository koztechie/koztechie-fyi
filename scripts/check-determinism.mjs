#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";

const snapshot = "dist2";

try {
  if (existsSync(snapshot)) rmSync(snapshot, { recursive: true, force: true });
  execFileSync("npm", ["run", "build"], { stdio: "inherit" });
  cpSync("dist", snapshot, { recursive: true });
  execFileSync("npm", ["run", "build"], { stdio: "inherit" });
  execFileSync("diff", ["-r", "dist", snapshot], { stdio: "inherit" });
  console.log("determinism: два послідовні build дають ідентичний dist");
} finally {
  if (existsSync(snapshot)) rmSync(snapshot, { recursive: true, force: true });
}
