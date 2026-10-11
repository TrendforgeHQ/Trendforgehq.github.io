#!/usr/bin/env node
/**
 * Offline, read-only structural inventory of the current published article catalogue.
 * Does not mutate articles or claim semantic fact-checking/source freshness.
 */
import { articles } from '../lib/articles.ts';
import { auditPublishedCatalogue } from './boat-published-catalogue-audit.mjs';

const results = auditPublishedCatalogue(articles);
const bySlug = new Map();
for (const article of articles) {
  const slug = typeof article?.slug === 'string' ? article.slug : '';
  if (!slug) continue;
  bySlug.set(slug, (bySlug.get(slug) ?? 0) + 1);
}
const duplicateSlugs = [...bySlug.entries()]
  .filter(([, count]) => count > 1)
  .map(([slug, count]) => ({ slug, count }))
  .sort((a, b) => a.slug.localeCompare(b.slug));
const findingCounts = {};
for (const result of results) {
  for (const finding of result.findings) findingCounts[finding] = (findingCounts[finding] ?? 0) + 1;
}
const report = {
  schemaVersion: 1,
  auditType: 'published-catalogue-structural-inventory',
  limitations: [
    'This is a deterministic structural scan, not a semantic factual audit.',
    'Claim-to-passage support, source freshness, source reachability, and attribution accuracy are not verified.',
    'Findings are review signals and do not authorize automatic article edits or publication decisions.',
  ],
  summary: {
    articles: articles.length,
    audited: results.length,
    articlesWithFindings: results.filter(item => item.findings.length > 0).length,
    totalFindings: results.reduce((sum, item) => sum + item.findings.length, 0),
    duplicateSlugs: duplicateSlugs.length,
    findingCounts: Object.fromEntries(Object.entries(findingCounts).sort(([a], [b]) => a.localeCompare(b))),
  },
  duplicateSlugs,
  articles: results,
};
process.stdout.write(JSON.stringify(report, null, 2) + '\\n');
