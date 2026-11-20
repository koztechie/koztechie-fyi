#!/usr/bin/env node

import { execFileSync } from "node:child_process";

export function getBuildSha() {
  const envSha = process.env.GITHUB_SHA?.trim();
  if (envSha) return envSha;

  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

export function getBuildEpoch() {
  const rawEpoch = process.env.SOURCE_DATE_EPOCH;
  if (!rawEpoch || !/^\d+$/.test(rawEpoch)) return null;

  const epoch = Number(rawEpoch);
  return Number.isSafeInteger(epoch) ? epoch : null;
}
