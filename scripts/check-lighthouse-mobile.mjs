#!/usr/bin/env node

import { readFileSync } from "node:fs";

const configPath = ".lighthouserc.mobile.json";
let config;

try {
  config = JSON.parse(readFileSync(configPath, "utf8"));
} catch (error) {
  console.error(`❌ G-10: ${configPath} не читається як JSON (${error.message})`);
  process.exit(1);
}

const settings = config.ci?.collect?.settings;
const assertions = config.ci?.assert?.assertions;
const failures = [];

if (settings?.formFactor !== "mobile") failures.push("formFactor має бути mobile");
if (settings?.throttlingMethod !== "simulate") failures.push("throttlingMethod має бути simulate");

const requiredBudgets = {
  "largest-contentful-paint": 1500,
  "cumulative-layout-shift": 0,
  "total-blocking-time": 1000,
};

for (const [metric, maxNumericValue] of Object.entries(requiredBudgets)) {
  const assertion = assertions?.[metric];
  if (!Array.isArray(assertion) || assertion[0] !== "error") {
    failures.push(`${metric} має бути error-assertion`);
    continue;
  }
  if (assertion[1]?.maxNumericValue !== maxNumericValue) {
    failures.push(`${metric}.maxNumericValue має бути ${maxNumericValue}`);
  }
}

if (failures.length > 0) {
  console.error(`❌ G-10: ${failures.join("; ")}`);
  process.exit(1);
}

console.log("✅ G-10: mobile simulate + LCP≤1500, CLS=0, TBT≤1000 зафіксовані як error-гейти");
