#!/usr/bin/env node
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { auditReviewSet } from './boat-semantic-support-review-set.mjs';

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0] === '--help' || args[0] === '-h') {
    console.error('Usage: node scripts/boat-semantic-support-review-set.mjs <review-set.json>');
    process.exitCode = args[0] === '--help' || args[0] === '-h' ? 0 : 2;
    return;
  }
  try {
    const input = JSON.parse(fs.readFileSync(args[0], 'utf8'));
    const report = auditReviewSet(input);
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    if (!report.valid) process.exitCode = 1;
  } catch (error) {
    process.stdout.write(JSON.stringify({
      valid: false,
      reviewSetStatus: 'invalid_input',
      recordCount: 0,
      records: [],
      findings: [{ type: 'input_error', message: error instanceof SyntaxError ? 'Input is not valid JSON.' : `Cannot read review set: ${error.message}` }],
      subjectGroups: []
    }, null, 2) + '\n');
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
