import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { articles } from '../lib/articles.ts';
import { auditPublishedCatalogue } from './boat-published-catalogue-audit.mjs';

const result = spawnSync(process.execPath, ['scripts/boat-audit-published-catalogue.mjs'], {
  encoding: 'utf8',
});
assert.equal(result.status, 0, result.stderr);
const report = JSON.parse(result.stdout);
assert.equal(report.schemaVersion, 1);
assert.equal(report.auditType, 'published-catalogue-structural-inventory');
assert.equal(report.summary.articles, articles.length);
assert.equal(report.summary.audited, articles.length);
assert.equal(report.articles.length, articles.length);
assert.deepEqual(report.articles, auditPublishedCatalogue(articles));
assert.equal(report.summary.articlesWithFindings, report.articles.filter(item => item.findings.length > 0).length);
assert.equal(report.summary.totalFindings, report.articles.reduce((sum, item) => sum + item.findings.length, 0));
assert.ok(Array.isArray(report.duplicateSlugs));
assert.ok(report.limitations.some(item => item.includes('not a semantic factual audit')));
assert.ok(report.limitations.some(item => item.includes('source freshness')));
assert.ok(report.limitations.some(item => item.includes('automatic article edits')));
console.log(`BOAT live catalogue structural inventory: PASS (${report.summary.audited} articles, ${report.summary.articlesWithFindings} flagged, ${report.summary.totalFindings} findings)`);
