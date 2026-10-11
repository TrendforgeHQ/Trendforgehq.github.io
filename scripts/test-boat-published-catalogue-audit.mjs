import assert from 'node:assert/strict';
import { auditPublishedCatalogue } from './boat-published-catalogue-audit.mjs';

const articles = [
  {
    slug: 'clean-article',
    title: 'Clean Article',
    content: [
      '## Useful context\nA useful paragraph that is long enough to be part of the structural repetition detector.',
      '## Further detail\nAnother useful paragraph that adds a different point and enough context for readers.',
    ],
    sources: [{ title: 'Publisher source', url: 'https://example.com/story' }],
  },
  {
    slug: 'flagged-article',
    title: 'Flagged Article',
    content: [
      'This paragraph is deliberately repeated and long enough to be picked up by the structural audit.',
      'This paragraph is deliberately repeated and long enough to be picked up by the structural audit.',
      '##\nNo source links are included in this file.',
    ],
    sources: [],
  },
];
const report = auditPublishedCatalogue(articles);
assert.equal(report.length, 2, 'every indexed published article is inventoried');
const flagged = report.find((article) => article.slug === 'flagged-article');
const clean = report.find((article) => article.slug === 'clean-article');
assert.ok(flagged);
assert.equal(flagged.title, 'Flagged Article');
assert.equal(flagged.urls, 0);
assert.equal(flagged.sourceHeading, false);
assert.equal(flagged.emptyHeadings, 1);
assert.equal(flagged.repeatedParagraphs, 1);
assert.ok(flagged.findings.includes('No HTTP(S) source links found'));
assert.ok(clean);
assert.equal(clean.sourceHeading, true);
assert.equal(clean.urls, 1);
assert.equal(clean.emptyHeadings, 0);
assert.equal(clean.repeatedParagraphs, 0);
assert.deepEqual(auditPublishedCatalogue(null), [], 'missing/non-array article index returns an unknown empty inventory');
console.log('BOAT published catalogue audit tests: PASS');
