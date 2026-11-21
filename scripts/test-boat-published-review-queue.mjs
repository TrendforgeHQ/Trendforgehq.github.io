import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { articles } from '../lib/articles.ts';
import { auditPublishedCatalogue, auditPublishedEvidenceCoverage, auditPublishedLineageCoverage } from './boat-published-catalogue-audit.mjs';
import { buildPublishedReviewQueue } from './boat-published-review-queue.mjs';

const fixtureArticles = [
  { slug: 'blocked', title: 'Blocked article' },
  { slug: 'unknown', title: 'Unknown article' },
  { slug: 'clean', title: 'Clean article' },
  { slug: 'duplicate', title: 'Duplicate A' },
  { slug: 'duplicate', title: 'Duplicate B' },
];
const structural = [
  { slug: 'blocked', title: 'Blocked article', findings: [], words: 500, urls: 3, sourceHeading: true, emptyHeadings: 0, repeatedParagraphs: 0 },
  { slug: 'unknown', title: 'Unknown article', findings: ['No HTTP(S) source links found'], words: 200, urls: 0, sourceHeading: false, emptyHeadings: 0, repeatedParagraphs: 0 },
  { slug: 'clean', title: 'Clean article', findings: [], words: 700, urls: 4, sourceHeading: true, emptyHeadings: 0, repeatedParagraphs: 0 },
  { slug: 'duplicate', title: 'Duplicate A', findings: [], words: 300, urls: 2, sourceHeading: true, emptyHeadings: 0, repeatedParagraphs: 0 },
];
const evidence = [
  { slug: 'blocked', status: 'conflicting-history', reportCount: 2, passReports: 1, blockedReports: 1, unknownReports: 0, evidencePackReports: 2, claimCount: 6, verified: 4, partial: 0, unsupported: 2, note: 'conflicting' },
  { slug: 'unknown', status: 'unknown', reportCount: 0, note: 'missing report' },
  { slug: 'clean', status: 'historical-pass', reportCount: 1, passReports: 1, blockedReports: 0, unknownReports: 0, evidencePackReports: 1, claimCount: 4, verified: 4, partial: 0, unsupported: 0, note: 'historical only' },
  { slug: 'duplicate', status: 'unknown', reportCount: 0, note: 'missing report' },
];
const lineage = [
  { slug: 'blocked', status: 'stale-manifest', manifestRecords: 1, matchingRecords: 0, note: 'stale' },
  { slug: 'unknown', status: 'unknown', manifestRecords: 0, matchingRecords: 0, note: 'unknown' },
  { slug: 'clean', status: 'current-byte-match', manifestRecords: 1, matchingRecords: 1, currentArticleSha256: 'a'.repeat(64), note: 'provenance only' },
  { slug: 'duplicate', status: 'unknown', manifestRecords: 0, matchingRecords: 0, note: 'unknown' },
];
const report = buildPublishedReviewQueue({
  articles: fixtureArticles, structural, evidence, lineage, duplicateSlugs: [{ slug: 'duplicate', count: 2 }],
});
assert.equal(report.reportType, 'published-article-review-queue');
assert.equal(report.readOnly, true);
assert.equal(report.automaticRepair, false);
assert.equal(report.automaticPublicationDecision, false);
assert.equal(report.summary.articles, fixtureArticles.length);
assert.equal(report.summary.countsReconciled, true);
assert.equal(report.summary.highPriority, 3);
assert.equal(report.summary.unknownEvidence, 3);
assert.equal(report.summary.unknownLineage, 3);
assert.equal(report.articles[0].slug, 'blocked');
assert.equal(report.articles[0].priority, 'high');
assert.equal(report.articles[0].evidence.status, 'conflicting-history');
assert.equal(report.articles[0].lineage.status, 'stale-manifest');
assert.ok(report.articles[0].suggestedActions.some(x => x.includes('conflicting outcome')));
assert.equal(report.articles.find(x => x.slug === 'clean').priority, 'normal');
assert.equal(report.articles.find(x => x.slug === 'clean').reviewState, 'needs-human-review');
assert.equal(report.articles.find(x => x.slug === 'duplicate').identityAmbiguous, true);
assert.ok(report.articles.every(x => x.limits.some(limit => limit.includes('does not prove claim truth'))));
assert.ok(report.limitations.some(x => x.includes('does not fetch public web')));

const actualStructural = auditPublishedCatalogue(articles);
const actualEvidence = auditPublishedEvidenceCoverage(articles, 'data/article-attempts');
const actualLineage = auditPublishedLineageCoverage(articles, 'content/articles', 'data/published-lineage');
const actualSlugCounts = new Map();
for (const article of articles) {
  if (typeof article?.slug === 'string' && article.slug) actualSlugCounts.set(article.slug, (actualSlugCounts.get(article.slug) ?? 0) + 1);
}
const actualDuplicates = [...actualSlugCounts.entries()].filter(([, count]) => count > 1).map(([slug, count]) => ({ slug, count }));
const expected = buildPublishedReviewQueue({ articles, structural: actualStructural, evidence: actualEvidence, lineage: actualLineage, duplicateSlugs: actualDuplicates });
const cliResult = spawnSync(process.execPath, ['scripts/boat-audit-published-review-queue.mjs'], { encoding: 'utf8' });
assert.equal(cliResult.status, 0, cliResult.stderr);
const cliReport = JSON.parse(cliResult.stdout);
assert.deepEqual(cliReport, expected);
assert.equal(cliReport.summary.articles, articles.length);
assert.equal(cliReport.summary.needsHumanReview, articles.length);
assert.equal(cliReport.articles.length, articles.length);
console.log(`BOAT published review queue: PASS (${cliReport.summary.articles} articles; ${cliReport.summary.highPriority} high, ${cliReport.summary.mediumPriority} medium, ${cliReport.summary.normalPriority} normal)`);
