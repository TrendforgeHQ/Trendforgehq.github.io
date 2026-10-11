#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyzeArticle } from './boat-article-doctor.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureFile = path.join(root, 'BOAT/fixtures/article-doctor-fixtures.json');
const fixtureIndex = JSON.parse(fs.readFileSync(fixtureFile, 'utf8'));
const schemaFile = path.join(root, 'BOAT/schemas/article-doctor-report.schema.json');
const reportSchema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
const fixedTime = '2026-10-11T00:00:00.000Z';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function loadFixture(fixture) {
  const articleText = fs.readFileSync(path.join(root, fixture.articlePath), 'utf8');
  const reportText = fs.readFileSync(path.join(root, fixture.reportPath), 'utf8');
  const metadataText = fs.readFileSync(path.join(root, fixture.metadataPath), 'utf8');
  return {
    articleText, report: JSON.parse(reportText), metadata: JSON.parse(metadataText),
    articlePath: fixture.articlePath, reportPath: fixture.reportPath, metadataPath: fixture.metadataPath,
    raw: [articleText, reportText, metadataText]
  };
}

test('generated report satisfies the Article Doctor schema contract', () => {
  const fixture = loadFixture(fixtureIndex.fixtures[0]);
  const report = analyzeArticle({
    articleText: fixture.articleText, articlePath: fixture.articlePath,
    report: fixture.report, reportPath: fixture.reportPath,
    metadata: fixture.metadata, metadataPath: fixture.metadataPath,
    expectedWorkflowRun: fixtureIndex.fixtures[0].workflowRun,
    generatedAt: fixedTime
  });
  for (const key of reportSchema.required) assert.ok(Object.hasOwn(report, key), 'missing report field ' + key);
  assert.equal(report.schemaVersion, reportSchema.properties.schemaVersion.const);
  assert.equal(report.mode, reportSchema.properties.mode.const);
  assert.match(report.reportId, new RegExp(reportSchema.properties.reportId.pattern));
  assert.ok(Number.isFinite(Date.parse(report.generatedAt)));
  assert.equal(report.subject.type, 'article');
  for (const finding of report.findings) {
    for (const key of reportSchema.properties.findings.items.required) assert.ok(Object.hasOwn(finding, key), 'missing finding field ' + key);
  }
  for (const item of report.provenance) assert.match(item.sha256, /^[a-f0-9]{64}$/);
});
test('fixture index is valid and all three archived attempts exist', () => {
  assert.equal(fixtureIndex.schemaVersion, '1.0');
  assert.equal(fixtureIndex.fixtures.length, 3);
  for (const fixture of fixtureIndex.fixtures) {
    for (const key of ['articlePath', 'reportPath', 'metadataPath']) {
      assert.ok(fs.existsSync(path.join(root, fixture[key])), `missing ${fixture[key]}`);
    }
  }
});

test('archived failure fixtures produce stable read-only reports', () => {
  for (const fixture of fixtureIndex.fixtures) {
    const input = loadFixture(fixture);
    const before = input.raw.map(sha);
    const args = {
      articleText: input.articleText, articlePath: input.articlePath,
      report: input.report, reportPath: input.reportPath,
      metadata: input.metadata, metadataPath: input.metadataPath,
      expectedWorkflowRun: fixture.workflowRun, generatedAt: fixedTime
    };
    const first = analyzeArticle(args);
    const second = analyzeArticle(args);
    assert.deepEqual(first, second, `${fixture.id} must be deterministic`);
    assert.equal(first.mode, 'read-only');
    assert.equal(first.subject.workflowRun, fixture.workflowRun);
    assert.equal(first.summary.status, 'blocked');
    assert.ok(first.summary.findingCount > 0);
    assert.ok(first.findings.some(item => item.category === 'unsupported_claim'), `${fixture.id} should retain unsupported-claim signal`);
    assert.ok(!first.findings.some(item => ['empty_heading', 'repeated_sentence'].includes(item.category)), `${fixture.id} should not receive structural false positives on this archived sample`);
    assert.ok(first.provenance.every(item => /^[a-f0-9]{64}$/.test(item.sha256)));
    assert.deepEqual(input.raw.map(sha), before, 'input files must remain byte-identical');
  }
});

test('maps attribution, numeric mismatch, contradiction and scope warnings independently', () => {
  const articleText = '---\ntitle: "Test Article"\n---\nA sample article sentence with enough words to make this a plausible factual claim.';
  const report = {
    articleTitle: 'Test Article', pass: false, claims: [
      { index: 1, claim: 'Claim with unsupported assertion.', status: 'unsupported', classification: 'unsupported' },
      { index: 2, claim: 'Claim with a number 45 percent.', status: 'partial', numericMismatch: true },
      { index: 3, claim: 'Contradicted statement.', status: 'contradicted', contradicted: true },
      { index: 4, claim: 'Attribution changed.', status: 'partial', attributionUncertainty: { blocked: true, certaintyEscalation: true, attributionDropped: true } },
      { index: 5, claim: 'An absolute claim was made.', status: 'partial', scopeWarnings: ['never'] }
    ]
  };
  const output = analyzeArticle({ articleText, articlePath: 'article.md', report, reportPath: 'claim.json', generatedAt: fixedTime });
  const categories = output.findings.map(item => item.category);
  for (const category of ['unsupported_claim', 'numeric_mismatch', 'contradicted_claim', 'attribution', 'temporal_context']) assert.ok(categories.includes(category), category);
  assert.equal(output.summary.status, 'blocked');
});

test('clean supported report yields clear without claiming independent source re-check', () => {
  const output = analyzeArticle({
    articleText: '---\ntitle: "Clean Article"\n---\nA clean article with one supported factual statement.',
    articlePath: 'clean.md',
    report: { articleTitle: 'Clean Article', pass: true, claims: [{ index: 1, claim: 'The agency published a report on Monday.', status: 'verified', classification: 'supported' }] },
    reportPath: 'clean-report.json',
    metadata: { workflowRun: '300', workflowSha: 'abc123' }, metadataPath: 'metadata.json',
    expectedWorkflowRun: '300', generatedAt: fixedTime
  });
  assert.equal(output.summary.status, 'clear');
  assert.equal(output.summary.findingCount, 0);
  assert.equal(output.checks[0].status, 'pass');
  assert.equal(output.checks[1].status, 'pass');
  assert.equal(output.checks[2].status, 'not_run');
});

test('partial-only certainty warning yields attention, not clear or blocked', () => {
  const output = analyzeArticle({
    articleText: '---\ntitle: "Partial Article"\n---\nA statement requiring careful attribution.',
    articlePath: 'partial.md',
    report: { articleTitle: 'Partial Article', pass: true, claims: [{ index: 1, claim: 'A source described a possible outcome.', status: 'partial', classification: 'supported_with_context', attributionUncertainty: { blocked: false, certaintyEscalation: true, attributionDropped: false } }] },
    reportPath: 'partial-report.json', generatedAt: fixedTime
  });
  assert.equal(output.summary.status, 'attention');
  assert.equal(output.summary.findingCount, 1);
  assert.equal(output.summary.highSeverityCount, 0);
  assert.equal(output.findings[0].category, 'attribution');
  assert.equal(output.findings[0].severity, 'medium');
});
test('empty headings and repeated sentences are read-only findings', () => {
  const repeated = 'This sentence is intentionally repeated in the article so the doctor can detect redundant editorial prose.';
  const articleText = '---\ntitle: "Structure Article"\n---\n## Introduction\n' + repeated + '\n\n##\n' + repeated + '\n';
  const output = analyzeArticle({
    articleText, articlePath: 'structure.md',
    report: { articleTitle: 'Structure Article', pass: true, claims: [] },
    reportPath: 'structure-report.json', generatedAt: fixedTime
  });
  const categories = output.findings.map(item => item.category);
  assert.ok(categories.includes('empty_heading'));
  assert.ok(categories.includes('repeated_sentence'));
  assert.equal(output.summary.status, 'attention');
  assert.ok(output.findings.every(item => item.evidence[0].artifactPath === 'structure.md'));
  assert.ok(output.findings.every(item => item.evidence[0].jsonPointer === null));
});
test('mismatched article title yields unknown status, never a clean pass', () => {
  const output = analyzeArticle({
    articleText: '---\ntitle: "Wrong Article"\n---\nBody.',
    articlePath: 'article.md', report: { articleTitle: 'Other Article', pass: true, claims: [] },
    reportPath: 'report.json', generatedAt: fixedTime
  });
  assert.equal(output.summary.status, 'unknown');
  assert.ok(output.findings.some(item => item.category === 'artifact_integrity'));
});

test('expected workflow run mismatch is an integrity finding', () => {
  const output = analyzeArticle({
    articleText: '---\ntitle: "Same Article"\n---\nBody.',
    articlePath: 'article.md', report: { articleTitle: 'Same Article', pass: true, claims: [] },
    reportPath: 'report.json', metadata: { workflowRun: '100' }, metadataPath: 'metadata.json',
    expectedWorkflowRun: '200', generatedAt: fixedTime
  });
  assert.equal(output.summary.status, 'unknown');
  assert.ok(output.findings.some(item => item.findingId === 'AD-ARTIFACT-RUN-001'));
});

test('CLI rejects a missing input without writing a report file', () => {
  const result = spawnSync(process.execPath, [
    path.join(root, 'scripts/boat-article-doctor.mjs'),
    '--article', path.join(root, 'does-not-exist.md'),
    '--report', path.join(root, 'does-not-exist.json')
  ], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /BOAT Article Doctor error/);
  assert.equal(fs.existsSync(path.join(root, 'does-not-exist.md')), false);
});
