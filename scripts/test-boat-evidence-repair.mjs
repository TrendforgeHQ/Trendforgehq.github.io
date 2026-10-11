import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { auditEvidenceLineage } from './boat-evidence-auditor.mjs';
import { proposeStructuralRepairs } from './boat-repair-engine.mjs';
import { analyzeArticle } from './boat-article-doctor.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const fixedTime = '2026-10-11T00:00:00.000Z';
function makeCase(overrides = {}) {
  const pack = {
    version: 1, status: 'authoritative', workflowRun: 'run-123',
    candidate: { title: 'Fixture', link: 'https://example.com/story', category: 'tech' },
    coverage: {}, blueprint: {},
    sources: [
      { id: 'S1', url: 'https://example.com/source-a', title: 'Source A', sourceRole: 'DIRECT_REPORTING', passages: ['First passage.', 'Second passage.'], publisherFamily: 'example' },
      { id: 'S2', url: 'https://example.com/source-b', title: 'Source B', sourceRole: 'CONTEXT', passages: ['Context passage.'], publisherFamily: 'example' }
    ]
  };
  const report = {
    workflowRun: 'run-123', articleTitle: 'Fixture',
    claims: [
      { index: 1, claim: 'A verified fixture claim.', sourceId: 'S1', sourceRole: 'DIRECT_REPORTING', bestUrl: 'https://example.com/source-a', matchedPassages: ['S1-P1'], bestPassageId: 'S1-P1', status: 'verified' },
      { index: 2, claim: 'A second fixture claim.', sourceId: 'S2', sourceRole: 'CONTEXT', bestUrl: 'https://example.com/source-b', matchedPassages: ['S2-P1'], bestPassageId: 'S2-P1', status: 'verified' }
    ]
  };
  Object.assign(report, overrides.report || {});
  if (overrides.claims) report.claims = overrides.claims;
  if (overrides.sources) pack.sources = overrides.sources;
  if (overrides.pack) Object.assign(pack, overrides.pack);
  if (overrides.run) report.workflowRun = overrides.run;
  const reportRaw = JSON.stringify(report, null, 2) + '\n';
  const packRaw = JSON.stringify(pack, null, 2) + '\n';
  const metadata = {
    workflowRun: 'run-123',
    workflowSha: 'abc123',
    claimReportSha256: hash(reportRaw),
    evidencePackSha256: hash(packRaw)
  };
  if (overrides.metadata) Object.assign(metadata, overrides.metadata);
  return { report, pack, metadata, reportRaw, packRaw };
}
function audit(data) {
  return auditEvidenceLineage({
    claimReport: data.report, evidencePack: data.pack, metadata: data.metadata,
    claimReportRaw: data.reportRaw, evidencePackRaw: data.packRaw,
    claimReportPath: 'claim.json', evidencePackPath: 'pack.json', metadataPath: 'metadata.json',
    generatedAt: fixedTime
  });
}

test('Evidence Auditor returns clear for matching, hash-bound lineage without claiming factual support', () => {
  const result = audit(makeCase());
  assert.equal(result.status, 'clear');
  assert.equal(result.summary.claimCount, 2);
  assert.equal(result.findings.length, 0);
  assert.match(result.limitations[1], /do not prove that a passage semantically supports/);
});
test('missing sourceId is reported and does not invent a source', () => {
  const data = makeCase();
  data.report.claims[0].sourceId = '';
  data.reportRaw = JSON.stringify(data.report, null, 2) + '\n';
  data.metadata.claimReportSha256 = hash(data.reportRaw);
  const result = audit(data);
  assert.ok(result.findings.some(item => item.code === 'EA-CLAIM-SOURCE-ID-MISSING'));
  assert.equal(result.status, 'blocked');
});
test('missing passage IDs block lineage', () => {
  const data = makeCase();
  data.report.claims[0].matchedPassages = [];
  data.reportRaw = JSON.stringify(data.report, null, 2) + '\n';
  data.metadata.claimReportSha256 = hash(data.reportRaw);
  const result = audit(data);
  assert.ok(result.findings.some(item => item.code === 'EA-CLAIM-PASSAGES-MISSING'));
  assert.equal(result.status, 'blocked');
});
test('wrong workflow run fails closed to unknown', () => {
  const data = makeCase({ run: 'run-other' });
  data.reportRaw = JSON.stringify(data.report, null, 2) + '\n';
  data.metadata.claimReportSha256 = hash(data.reportRaw);
  const result = audit(data);
  assert.equal(result.status, 'unknown');
  assert.ok(result.findings.some(item => item.code === 'EA-REPORT-RUN-MISMATCH'));
});
test('changed pack bytes fail exact artifact pairing', () => {
  const data = makeCase();
  data.packRaw += ' ';
  const result = audit(data);
  assert.equal(result.status, 'unknown');
  assert.ok(result.findings.some(item => item.code === 'EA-PACK-HASH-MISMATCH'));
});
test('missing hashes make lineage unknown, not clear', () => {
  const data = makeCase({ metadata: { evidencePackSha256: '', claimReportSha256: '' } });
  const result = audit(data);
  assert.equal(result.status, 'unknown');
  assert.ok(result.findings.some(item => item.code === 'EA-LINEAGE-HASH-MISSING'));
});
test('source URL mismatch is detected', () => {
  const data = makeCase();
  data.report.claims[0].bestUrl = 'https://different.example/story';
  data.reportRaw = JSON.stringify(data.report, null, 2) + '\n';
  data.metadata.claimReportSha256 = hash(data.reportRaw);
  const result = audit(data);
  assert.ok(result.findings.some(item => item.code === 'EA-CLAIM-URL-MISMATCH'));
});
test('unknown passage ID is detected against pack passage IDs', () => {
  const data = makeCase();
  data.report.claims[0].matchedPassages = ['S1-P99'];
  data.reportRaw = JSON.stringify(data.report, null, 2) + '\n';
  data.metadata.claimReportSha256 = hash(data.reportRaw);
  const result = audit(data);
  assert.ok(result.findings.some(item => item.code === 'EA-PASSAGE-ID-UNKNOWN'));
});
test('duplicate/conflicting source IDs are detected', () => {
  const data = makeCase();
  data.pack.sources.push({ ...data.pack.sources[0], url: 'https://conflict.example', title: 'Conflicting source', passages: ['Different'] });
  data.packRaw = JSON.stringify(data.pack, null, 2) + '\n';
  data.metadata.evidencePackSha256 = hash(data.packRaw);
  const result = audit(data);
  assert.ok(result.findings.some(item => item.code === 'EA-PACK-SOURCE-CONFLICT'));
});
test('missing source role is reported without guessing a role', () => {
  const data = makeCase();
  delete data.report.claims[0].sourceRole;
  data.reportRaw = JSON.stringify(data.report, null, 2) + '\n';
  data.metadata.claimReportSha256 = hash(data.reportRaw);
  const result = audit(data);
  assert.ok(result.findings.some(item => item.code === 'EA-CLAIM-ROLE-MISSING'));
});

test('repair removes empty headings and duplicate plain paragraphs in an isolated result', () => {
  const repeated = 'This paragraph is repeated exactly and can be removed without rewriting factual language.';
  const article = [
    '---', 'title: "Repair Fixture"', '---', '',
    '## Introduction', repeated, '', '##', '', repeated, '',
    '## Sources', '- https://example.com/source', ''
  ].join('\n');
  const result = proposeStructuralRepairs(article);
  assert.equal(result.changed, true);
  assert.ok(result.changes.some(item => item.type === 'empty_heading_removed'));
  assert.ok(result.changes.some(item => item.type === 'duplicate_paragraph_removed'));
  assert.ok(result.repairedMarkdown.includes('## Sources\n- https://example.com/source'));
  assert.equal(article.includes('\n##\n'), true, 'input string remains unchanged');
  const doctor = analyzeArticle({
    articleText: result.repairedMarkdown, articlePath: 'repair.md',
    report: { articleTitle: 'Repair Fixture', pass: true, claims: [] },
    reportPath: 'claim.json', generatedAt: fixedTime
  });
  assert.ok(!doctor.findings.some(item => ['empty_heading', 'repeated_sentence'].includes(item.category)));
});
test('repair leaves frontmatter, source section, lists, and code blocks untouched', () => {
  const article = [
    '---', 'title: "Protected"', 'custom: preserve-me', '---', '',
    '## Sources', '- https://example.com/a', '- https://example.com/a', '',
    '```md', '##', 'same code', 'same code', '```', ''
  ].join('\n');
  const result = proposeStructuralRepairs(article);
  assert.equal(result.repairedMarkdown, article);
  assert.equal(result.changes.length, 0);
});
test('repair CLI refuses in-place edits and output overwrites', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-repair-cli-'));
  try {
    const input = path.join(dir, 'article.md');
    fs.writeFileSync(input, '##\n\nA paragraph.');
    const script = path.resolve('scripts/boat-repair-engine.mjs');
    const same = spawnSync(process.execPath, [script, '--input', input, '--output', input], { encoding: 'utf8' });
    assert.equal(same.status, 2);
    assert.match(same.stderr, /Refusing in-place repair/);
    const output = path.join(dir, 'fixed.md');
    fs.writeFileSync(output, 'existing');
    const overwrite = spawnSync(process.execPath, [script, '--input', input, '--output', output], { encoding: 'utf8' });
    assert.equal(overwrite.status, 2);
    assert.match(overwrite.stderr, /Refusing to overwrite/);
    assert.equal(fs.readFileSync(input, 'utf8'), '##\n\nA paragraph.');
    assert.equal(fs.readFileSync(output, 'utf8'), 'existing');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
