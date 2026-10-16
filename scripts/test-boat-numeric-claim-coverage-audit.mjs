import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { auditNumericClaimCoverage } from './boat-numeric-claim-coverage-audit.mjs';

const article = `---
title: "Finance example"
---
The proposal involves $8 billion in equipment financing.
The company has raised its target to $385 billion from $315 billion, according to the article draft.
The plan is expected to reach $220 billion this year.
`;
const report = {
  articlePath: 'content/articles/example.md',
  generatedAt: '2026-10-11T00:00:00.000Z',
  pass: true,
  claimCount: 2,
  claims: [
    { index: 1, claim: 'The proposal involves $8 billion in equipment financing.', status: 'verified' },
    { index: 2, claim: 'The plan is expected to reach $220 billion this year.', status: 'partial' }
  ]
};
const audit = auditNumericClaimCoverage({ articleRaw: article, report });
assert.equal(audit.reportType, 'boat-numeric-claim-coverage-gap-audit');
assert.equal(audit.readOnly, true);
assert.equal(audit.automaticRepair, false);
assert.equal(audit.summary.numericSentences, 3);
assert.equal(audit.summary.coveredBySavedClaimText, 2);
assert.equal(audit.summary.reviewGaps, 1);
assert.equal(audit.summary.savedVerifierPassWithCoverageGaps, true);
assert.deepEqual(audit.findings[1].missingNumericTokens, ['$385b', '$315b']);
assert.equal(audit.findings[1].status, 'review-numeric-claim-coverage-gap');
assert.ok(audit.limitations.some(item => item.includes('does not fetch sources')));

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-numeric-coverage-'));
try {
  fs.mkdirSync(path.join(tempRoot, 'data'), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, 'content', 'articles'), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, 'data', 'claim-verification.json'), JSON.stringify(report));
  fs.writeFileSync(path.join(tempRoot, 'content', 'articles', 'example.md'), article);
  const cli = spawnSync(process.execPath, ['scripts/boat-numeric-claim-coverage-audit.mjs'], {
    encoding: 'utf8', env: { ...process.env, BOAT_AUDIT_ROOT: tempRoot }
  });
  assert.equal(cli.status, 0, cli.stderr);
  const live = JSON.parse(cli.stdout);
  assert.equal(live.summary.inputStatus, 'read-only-article-and-report-loaded');
  assert.equal(live.summary.reviewGaps, 1);
  assert.equal(live.verifierReport.savedPass, true);
  assert.equal(live.findings[1].status, 'review-numeric-claim-coverage-gap');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
console.log('BOAT numeric claim coverage audit: PASS (numeric claim omission surfaced despite saved verifier PASS; no repair performed)');
