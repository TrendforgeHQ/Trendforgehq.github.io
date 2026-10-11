import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auditPublishedCatalogue, auditPublishedEvidenceCoverage, auditPublishedLineageCoverage } from './boat-published-catalogue-audit.mjs';

// Structural catalogue scan: every canonical published article is inventoried.
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
const structural = auditPublishedCatalogue(articles);
assert.equal(structural.length, 2);
const flagged = structural.find(article => article.slug === 'flagged-article');
const clean = structural.find(article => article.slug === 'clean-article');
assert.ok(flagged);
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
assert.deepEqual(auditPublishedCatalogue(null), []);

// Archived claim reports are historical signals only; absent reports stay unknown.
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
  const coverage = auditPublishedEvidenceCoverage([
    { slug: 'alpha', title: 'Alpha' }, { slug: 'beta', title: 'Beta' }, { slug: 'gamma', title: 'Gamma' }
  ], root);
  const alpha = coverage.find(item => item.slug === 'alpha');
  const beta = coverage.find(item => item.slug === 'beta');
  const gamma = coverage.find(item => item.slug === 'gamma');
  assert.equal(alpha.status, 'historical-block');
  assert.equal(alpha.unsupported, 1);
  assert.equal(beta.status, 'historical-pass');
  assert.equal(beta.evidencePackReports, 1);
  assert.match(beta.note, /not hash-linked/);
  assert.equal(gamma.status, 'unknown');
  assert.equal(auditPublishedEvidenceCoverage([{ slug: 'x' }], path.join(root, 'missing'))[0].status, 'unknown');
  console.log('BOAT published catalogue and evidence coverage tests: PASS');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}


// Current-byte lineage is distinguished from historical articlePath-only coverage.
const lineageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-lineage-coverage-'));
try {
  const articleDir = path.join(lineageRoot, 'content/articles');
  const lineageDir = path.join(lineageRoot, 'data/published-lineage');
  fs.mkdirSync(articleDir, { recursive: true });
  fs.mkdirSync(lineageDir, { recursive: true });
  const alphaBytes = '---\\ntitle: "Alpha"\\n---\\nCurrent published alpha bytes.\\n';
  const betaCurrentBytes = '---\\ntitle: "Beta"\\n---\\nCurrent beta bytes changed after an older manifest.\\n';
  fs.writeFileSync(path.join(articleDir, 'alpha.md'), alphaBytes);
  fs.writeFileSync(path.join(articleDir, 'beta.md'), betaCurrentBytes);
  const hash = value => crypto.createHash('sha256').update(value).digest('hex');
  const makeRecord = (slug, bytes) => ({
    schemaVersion: 1, slug, articlePath: `content/articles/${slug}.md`,
    workflowRun: '38126000003', workflowSha: 'c'.repeat(40),
    hashes: { articleSha256: hash(bytes), claimReportSha256: '1'.repeat(64), evidencePackSha256: '2'.repeat(64), articleBriefSha256: '3'.repeat(64), currentRunMarkerSha256: '4'.repeat(64) },
    claimVerification: { status: 'pass', claimCount: 1 },
    evidencePack: { evidencePackStatus: 'authoritative', sourceCount: 1 },
  });
  fs.writeFileSync(path.join(lineageDir, 'manifest-38126000003.json'), JSON.stringify({
    schemaVersion: 1, workflowRun: '38126000003', workflowSha: 'c'.repeat(40),
    records: [makeRecord('alpha', alphaBytes), makeRecord('beta', '---\\ntitle: "Beta"\\n---\\nOld beta bytes.\\n')],
  }));
  const current = auditPublishedLineageCoverage([
    { slug: 'alpha', title: 'Alpha' }, { slug: 'beta', title: 'Beta' }, { slug: 'gamma', title: 'Gamma' }, { slug: 'missing', title: 'Missing file' },
  ], articleDir, lineageDir);
  assert.equal(current.find(item => item.slug === 'alpha').status, 'current-byte-match');
  assert.equal(current.find(item => item.slug === 'beta').status, 'stale-manifest');
  assert.equal(current.find(item => item.slug === 'gamma').status, 'unknown');
  assert.equal(current.find(item => item.slug === 'missing').status, 'unknown');
  const invalidRoot = path.join(lineageDir, 'manifest-38126000004.json');
  fs.writeFileSync(invalidRoot, JSON.stringify({ schemaVersion: 1, workflowRun: '38126000004', workflowSha: 'd'.repeat(40), records: [{ ...makeRecord('alpha', alphaBytes), hashes: { articleSha256: 'bad' } }] }));
  const invalid = auditPublishedLineageCoverage([{ slug: 'alpha', title: 'Alpha' }], articleDir, lineageDir)[0];
  assert.equal(invalid.status, 'current-byte-match', 'one valid matching manifest remains valid despite a separate malformed record');
  assert.equal(auditPublishedLineageCoverage(null, articleDir, lineageDir).length, 0);
  console.log('BOAT published current-byte lineage coverage tests: PASS');
} finally {
  fs.rmSync(lineageRoot, { recursive: true, force: true });
}
