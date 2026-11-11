#!/usr/bin/env node
/** Read-only combined triage report for every canonical published article. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { articles } from '../lib/articles.ts';
import {
  auditPublishedCatalogue,
  auditPublishedEvidenceCoverage,
  auditPublishedLineageCoverage,
} from './boat-published-catalogue-audit.mjs';
import { buildPublishedReviewQueue } from './boat-published-review-queue.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slugCounts = new Map();
for (const article of articles) {
  const slug = typeof article?.slug === 'string' ? article.slug : '';
  if (slug) slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
}
const duplicateSlugs = [...slugCounts.entries()]
  .filter(([, count]) => count > 1)
  .map(([slug, count]) => ({ slug, count }));
const report = buildPublishedReviewQueue({
  articles,
  structural: auditPublishedCatalogue(articles),
  evidence: auditPublishedEvidenceCoverage(articles, path.join(root, 'data', 'article-attempts')),
  lineage: auditPublishedLineageCoverage(
    articles,
    path.join(root, 'content', 'articles'),
    path.join(root, 'data', 'published-lineage'),
  ),
  duplicateSlugs,
});
process.stdout.write(JSON.stringify(report, null, 2) + String.fromCharCode(10));
