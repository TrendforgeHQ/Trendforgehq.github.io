import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auditPublishedCatalogue } from './boat-published-catalogue-audit.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-catalogue-'));
try {
  fs.writeFileSync(path.join(root, 'clean.md'), `---
title: "Clean Article"
---
# Clean Article

A useful paragraph that is long enough to be part of the structural repetition detector.

## Sources

- https://example.com/story
`);
  fs.writeFileSync(path.join(root, 'flagged.md'), `# Flagged Article

This paragraph is deliberately repeated and long enough to be picked up by the structural audit.

This paragraph is deliberately repeated and long enough to be picked up by the structural audit.

##

No source links are included in this file.
`);
  fs.writeFileSync(path.join(root, 'ignore.txt'), 'not an article');
  const report = auditPublishedCatalogue(root);
  assert.equal(report.length, 2, 'only Markdown article files are inventoried');
  const flagged = report.find((article) => article.file === 'flagged.md');
  const clean = report.find((article) => article.file === 'clean.md');
  assert.ok(flagged);
  assert.equal(flagged.title, 'Flagged Article');
  assert.equal(flagged.urls, 0);
  assert.equal(flagged.sourceHeading, false);
  assert.equal(flagged.emptyHeadings, 1);
  assert.equal(flagged.repeatedParagraphs, 1);
  assert.ok(flagged.findings.includes('No HTTP(S) links found'));
  assert.ok(clean);
  assert.equal(clean.sourceHeading, true);
  assert.equal(clean.urls, 1);
  assert.equal(clean.emptyHeadings, 0);
  assert.equal(auditPublishedCatalogue(path.join(root, 'missing')).length, 0, 'missing directory is explicit empty inventory');
  console.log('BOAT published catalogue audit tests: PASS');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
