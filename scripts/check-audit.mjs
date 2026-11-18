#!/usr/bin/env node

import { readFileSync } from "node:fs";

const reports = process.argv.slice(2);
if (reports.length === 0) {
  console.error("❌ G-12: не передано audit JSON");
  process.exit(1);
}

let failed = false;
for (const reportPath of reports) {
  let report;
  try {
    report = JSON.parse(readFileSync(reportPath, "utf8"));
  } catch (error) {
    console.error(`❌ G-12: ${reportPath} невалідний (${error.message})`);
    failed = true;
    continue;
  }

  const vulnerabilities = report.metadata?.vulnerabilities;
  if (!vulnerabilities) {
    console.error(`❌ G-12: ${reportPath} не містить metadata.vulnerabilities`);
    failed = true;
    continue;
  }

  const high = vulnerabilities.high || 0;
  const critical = vulnerabilities.critical || 0;
  if (high || critical) {
    console.error(`❌ G-12: ${reportPath}: high=${high}, critical=${critical}`);
    failed = true;
  } else {
    console.log(`✅ G-12: ${reportPath}: high=0, critical=0`);
  }
}

if (failed) process.exit(1);
