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

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auditPublishedEvidenceCoverage } from './boat-published-catalogue-audit.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-evidence-'));
try {
  const blocked = path.join(root, 'attempt-blocked');
  const passed = path.join(root, 'attempt-passed');
  fs.mkdirSync(blocked);
  fs.mkdirSync(passed);
  fs.writeFileSync(path.join(blocked, 'metadata.json'), JSON.stringify({ status: 'claim-verification-blocked' }));
  fs.writeFileSync(path.join(blocked, 'claim-verification.json'), JSON.stringify({
    articlePath: 'content/articles/alpha.md', pass: false, claimCount: 3, verified: 2, partial: 0, unsupported: 1
  }));
  fs.writeFileSync(path.join(passed, 'claim-verification.json'), JSON.stringify({
    articlePath: 'content/articles/beta.md', pass: true, claimCount: 4, verified: 4, partial: 0, unsupported: 0
  }));
  fs.writeFileSync(path.join(passed, 'authoritative-evidence-pack.json'), '{}');
  const report = auditPublishedEvidenceCoverage([
    { slug: 'alpha', title: 'Alpha' }, { slug: 'beta', title: 'Beta' }, { slug: 'gamma', title: 'Gamma' }
  ], root);
  const alpha = report.find(item => item.slug === 'alpha');
  const beta = report.find(item => item.slug === 'beta');
  const gamma = report.find(item => item.slug === 'gamma');
  assert.equal(alpha.status, 'historical-block');
  assert.equal(alpha.unsupported, 1);
  assert.equal(beta.status, 'historical-pass');
  assert.equal(beta.evidencePackReports, 1);
  assert.match(beta.note, /not hash-linked/);
  assert.equal(gamma.status, 'unknown');
  assert.equal(auditPublishedEvidenceCoverage([{ slug: 'x' }], path.join(root, 'missing'))[0].status, 'unknown');
  console.log('BOAT published evidence coverage tests: PASS');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
