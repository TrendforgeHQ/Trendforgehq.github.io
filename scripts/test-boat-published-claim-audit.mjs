import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { articles } from '../lib/articles.ts';
import { auditPublishedClaims } from './boat-published-claim-audit.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-published-claims-'));
try {
  const attempts = path.join(root, 'attempts');
  const current = path.join(root, 'content/articles');
  fs.mkdirSync(attempts, { recursive: true });
  fs.mkdirSync(current, { recursive: true });
  fs.writeFileSync(path.join(current, 'alpha.md'), '---\ntitle: "Alpha"\n---\nA supported sentence.\n');
  fs.writeFileSync(path.join(current, 'beta.md'), '---\ntitle: "Beta"\n---\nCurrent wording differs from archived claim text.\n');
  fs.writeFileSync(path.join(current, 'gamma.md'), '---\ntitle: "Gamma"\n---\nNo archived verifier report exists for this article.\n');
  const reportA = {
    articlePath: 'content/articles/alpha.md', articleTitle: 'Alpha', pass: false, claimCount: 2,
    sources: [{ id: 'S1', title: 'Example source', url: 'https://example.com/report' }],
    claims: [
      { index: 1, claim: 'A supported sentence.', status: 'verified', classification: 'supported', sourceId: 'S1', bestUrl: 'https://example.com/report', bestSource: 'Example source', bestPassageId: 'S1-P1', evidence: 'The source reports a supported sentence.' },
      { index: 2, claim: 'A claim with an unsupported detail.', status: 'unsupported', classification: 'unsupported', sourceId: 'S1', bestUrl: 'https://example.com/report', bestSource: 'Example source', bestPassageId: 'S1-P2', evidence: 'Context excerpt.' }
    ]
  };
  const reportB = { articlePath: 'content/articles/beta.md', articleTitle: 'Beta', pass: true, claims: [{ index: 1, claim: 'Old archived sentence not in current article.', status: 'verified' }] };
  const reportC = { articlePath: 'content/articles/beta.md', articleTitle: 'Beta', pass: false, claims: [{ index: 1, claim: 'Old archived sentence not in current article.', status: 'unsupported', numericMismatch: true }] };
  for (const [folder, report, metadata] of [
    ['alpha-attempt', reportA, { workflowRun: '100', workflowSha: 'a'.repeat(40), status: 'claim-verification-blocked' }],
    ['beta-pass', reportB, { workflowRun: '200', workflowSha: 'b'.repeat(40), status: 'generated-pending-verification' }],
    ['beta-block', reportC, { workflowRun: '201', workflowSha: 'c'.repeat(40), status: 'claim-verification-blocked' }]
  ]) {
    const dir = path.join(attempts, folder); fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'claim-verification.json'), JSON.stringify(report));
    fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(metadata));
  }
  const result = auditPublishedClaims({
    articles: [{ slug: 'alpha', title: 'Alpha' }, { slug: 'beta', title: 'Beta' }, { slug: 'gamma', title: 'Gamma' }],
    attemptsDirectory: attempts, articlesDirectory: current
  });
  assert.equal(result.reportType, 'published-claim-level-audit');
  assert.equal(result.readOnly, true);
  assert.equal(result.automaticRepair, false);
  assert.equal(result.automaticPublicationDecision, false);
  assert.equal(result.summary.articles, 3);
  assert.equal(result.summary.articlesWithReports, 2);
  assert.equal(result.summary.articlesWithoutReports, 1);
  assert.equal(result.summary.archivedReports, 3);
  assert.equal(result.summary.claims, 4);
  assert.equal(result.summary.unsupported, 2);
  assert.equal(result.summary.numericMismatch, 1);
  assert.equal(result.summary.countsReconciled, true);
  const alpha = result.articles.find(a => a.slug === 'alpha');
  assert.equal(alpha.status, 'historical-block-present');
  assert.equal(alpha.claims, 2);
  assert.equal(alpha.unsupportedClaims, 1);
  assert.equal(alpha.reports[0].claims[0].currentArticleTextStatus, 'exact-normalized-text-found');
  assert.equal(alpha.reports[0].claims[1].source.url, 'https://example.com/report');
  assert.equal(alpha.reports[0].claims[1].passages[0].id, 'S1-P2');
  assert.equal(alpha.reports[0].claims[1].reviewStatus, 'review-required');
  const beta = result.articles.find(a => a.slug === 'beta');
  assert.equal(beta.status, 'conflicting-historical-outcomes');
  assert.equal(beta.archivedReportCount, 2);
  assert.equal(beta.claimsNotExactlyFoundInCurrentArticle, 2);
  const gamma = result.articles.find(a => a.slug === 'gamma');
  assert.equal(gamma.status, 'unknown-no-archived-claim-report');
  assert.equal(gamma.archivedReportCount, 0);
  assert.ok(result.limitations.some(item => item.includes('does not run a new verifier')));
  assert.ok(result.limitations.some(item => item.includes('not current verification')));

  const cli = spawnSync(process.execPath, ['scripts/boat-audit-published-claims.mjs'], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  const live = JSON.parse(cli.stdout);
  assert.equal(live.reportType, 'published-claim-level-audit');
  assert.equal(live.summary.articles, articles.length);
  assert.equal(live.articles.length, articles.length);
  assert.equal(live.summary.countsReconciled, true);
  assert.equal(live.articles.reduce((sum, a) => sum + a.claims, 0), live.summary.claims);
  assert.equal(live.articles.reduce((sum, a) => sum + a.unsupportedClaims, 0), live.summary.unsupported);
  assert.ok(live.articles.every(a => a.reports.every(r => r.claims.every(c => c.note.includes('not been independently checked')))));
  console.log(`BOAT published claim-level audit: PASS (${live.summary.articles} articles, ${live.summary.archivedReports} archived reports, ${live.summary.claims} claim records)`);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
