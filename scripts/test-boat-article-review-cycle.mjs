#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createArticleReviewCycle, applyApprovedRepair } from './boat-article-review-cycle.mjs';
import { proposeStructuralRepairs } from './boat-repair-engine.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
const stable = value => JSON.stringify(canonical(value));
const commit = 'a'.repeat(40);
function fixture() {
  const repeated = 'This paragraph repeats exactly so BOAT can remove the duplicate without rewriting any factual claim.';
  const articleRaw = ['---','title: "Cycle Fixture"','---','', '## Introduction', repeated, '', '##', '', repeated, '', '## Sources', '- https://example.com/source', ''].join('\n');
  const claimReport = { articleTitle: 'Cycle Fixture', articlePath: 'content/articles/cycle-fixture.md', workflowRun: '123456', pass: true, claims: [] };
  const evidencePack = { workflowRun: '123456', sources: [] };
  const claimReportRaw = JSON.stringify(claimReport, null, 2) + '\n';
  const evidencePackRaw = JSON.stringify(evidencePack, null, 2) + '\n';
  const metadataRaw = JSON.stringify({
    workflowRun: '123456', workflowSha: commit,
    articleSha256: sha(articleRaw), claimReportSha256: sha(claimReportRaw), evidencePackSha256: sha(evidencePackRaw)
  }, null, 2) + '\n';
  return { articleRaw, claimReportRaw, evidencePackRaw, metadataRaw, articlePath: 'content/articles/cycle-fixture.md' };
}
function makeReview(f = fixture()) {
  return createArticleReviewCycle({ ...f, baseCommitSha: commit, generatedAt: '2026-10-12T12:00:00.000Z' });
}
function approve(proposal) {
  return {
    schemaVersion: 1, decision: 'approve', proposalHash: proposal.proposalHash,
    baseCommitSha: proposal.baseCommitSha, targetPath: proposal.targetPath,
    beforeSha256: proposal.beforeSha256, afterSha256: proposal.afterSha256,
    approvedBy: 'offline-test-operator', approvedAt: '2026-10-12T12:01:00.000Z',
    rationale: 'Reviewed the exact structural-only diff and approved a sandbox candidate.'
  };
}

test('one-article vertical slice binds audit, evidence lineage, structural proposal, approval, verification and learning', () => {
  const f = fixture();
  const { review, proposal } = makeReview(f);
  assert.equal(review.mode, 'offline-read-only');
  assert.equal(review.targetPath, f.articlePath);
  assert.equal(review.articleDoctor.subject.title, 'Cycle Fixture');
  assert.equal(review.evidenceAudit.status, 'clear');
  assert.equal(proposal.status, 'review_required');
  assert.equal(proposal.approvalRequired, true);
  assert.equal(proposal.automaticApplication, false);
  assert.equal(proposal.semanticSupport, 'not_verified');
  assert.ok(proposal.changes.some(item => item.type === 'empty_heading_removed'));
  assert.ok(proposal.changes.some(item => item.type === 'duplicate_paragraph_removed'));
  const { proposalHash, ...core } = proposal;
  assert.equal(proposalHash, sha(stable(core)));
  const applied = applyApprovedRepair({ proposal, approval: approve(proposal), currentArticleRaw: f.articleRaw, currentCommitSha: commit, appliedAt: '2026-10-12T12:02:00.000Z' });
  assert.equal(applied.candidateSha256, sha(applied.candidateMarkdown));
  assert.equal(applied.candidateMarkdown.includes('\n##\n'), false);
  assert.equal(applied.candidateMarkdown.split('This paragraph repeats exactly so BOAT can remove the duplicate without rewriting any factual claim.').length - 1, 1);
  assert.equal(proposeStructuralRepairs(applied.candidateMarkdown).changed, false);
  assert.equal(f.articleRaw.includes('\n##\n'), true, 'original article bytes remain unchanged');
  assert.equal(applied.learningRecord.verification.structuralRepairIdempotent, true);
  assert.equal(applied.learningRecord.verification.semanticSupport, 'not_verified');
  assert.equal(applied.learningRecord.verification.claimVerifierRerun, false);
  assert.equal(applied.learningRecord.outcome, 'sandbox_candidate_verified_not_published');
});

test('approval is mandatory and proposal bytes/hash are immutable', () => {
  const f = fixture();
  const { proposal } = makeReview(f);
  assert.throws(() => applyApprovedRepair({ proposal, currentArticleRaw: f.articleRaw, currentCommitSha: commit }), /approval record is required/);
  const tampered = { ...proposal, proposedMarkdown: proposal.proposedMarkdown + 'tamper\n' };
  assert.throws(() => applyApprovedRepair({ proposal: tampered, approval: approve(proposal), currentArticleRaw: f.articleRaw, currentCommitSha: commit }), /Proposal hash does not match/);
  assert.throws(() => applyApprovedRepair({ proposal, approval: { ...approve(proposal), decision: 'reject' }, currentArticleRaw: f.articleRaw, currentCommitSha: commit }), /explicitly be approve/);
});

test('approval cannot be replayed against another commit, article bytes, target or hash', () => {
  const f = fixture();
  const { proposal } = makeReview(f);
  const approval = approve(proposal);
  assert.throws(() => applyApprovedRepair({ proposal, approval, currentArticleRaw: f.articleRaw, currentCommitSha: 'b'.repeat(40) }), /differs from the proposal base commit/);
  assert.throws(() => applyApprovedRepair({ proposal, approval, currentArticleRaw: f.articleRaw + 'changed', currentCommitSha: commit }), /article bytes differ/);
  assert.throws(() => applyApprovedRepair({ proposal, approval: { ...approval, targetPath: 'content/articles/other.md' }, currentArticleRaw: f.articleRaw, currentCommitSha: commit }), /binding mismatch: targetPath/);
  assert.throws(() => applyApprovedRepair({ proposal, approval: { ...approval, proposalHash: 'f'.repeat(64) }, currentArticleRaw: f.articleRaw, currentCommitSha: commit }), /binding mismatch: proposalHash/);
});

test('artifact hash mismatch blocks proposal and cannot be applied', () => {
  const f = fixture();
  const metadata = JSON.parse(f.metadataRaw);
  metadata.claimReportSha256 = '0'.repeat(64);
  f.metadataRaw = JSON.stringify(metadata, null, 2) + '\n';
  const { review, proposal } = makeReview(f);
  assert.equal(review.evidenceAudit.status, 'unknown');
  assert.equal(proposal.status, 'blocked');
  assert.throws(() => applyApprovedRepair({ proposal, approval: approve(proposal), currentArticleRaw: f.articleRaw, currentCommitSha: commit }), /review_required proposal/);
});

test('unsafe article paths and malformed commit pins fail closed', () => {
  const f = fixture();
  assert.throws(() => createArticleReviewCycle({ ...f, articlePath: '../content/articles/escape.md', baseCommitSha: commit }), /allowlisted article path/);
  assert.throws(() => createArticleReviewCycle({ ...f, baseCommitSha: 'short' }), /full lowercase 40-character/);
});

test('CLI applies only into a separate sandbox path and writes an auditable learning record', () => {
  const f = fixture();
  const { proposal } = makeReview(f);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-review-cycle-'));
  try {
    const article = path.join(dir, 'article.md');
    const proposalFile = path.join(dir, 'proposal.json');
    const approvalFile = path.join(dir, 'approval.json');
    const outputFile = path.join(dir, 'candidate.md');
    const learningFile = path.join(dir, 'learning.json');
    fs.writeFileSync(article, f.articleRaw);
    fs.writeFileSync(proposalFile, JSON.stringify(proposal, null, 2));
    fs.writeFileSync(approvalFile, JSON.stringify(approve(proposal), null, 2));
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/boat-article-review-cycle.mjs'),
      '--mode','apply','--article',article,'--proposal',proposalFile,'--approval',approvalFile,
      '--commit',commit,'--output',outputFile,'--learning-record',learningFile], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).published, false);
    assert.equal(fs.readFileSync(article, 'utf8'), f.articleRaw);
    assert.ok(fs.existsSync(outputFile));
    assert.ok(fs.existsSync(learningFile));
    assert.equal(JSON.parse(fs.readFileSync(learningFile, 'utf8')).proposalHash, proposal.proposalHash);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('CLI refuses to overwrite candidate or learning artifacts', () => {
  const f = fixture();
  const { proposal } = makeReview(f);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-review-cycle-no-overwrite-'));
  try {
    const article = path.join(dir, 'article.md'), proposalFile = path.join(dir, 'proposal.json'), approvalFile = path.join(dir, 'approval.json');
    const outputFile = path.join(dir, 'candidate.md'), learningFile = path.join(dir, 'learning.json');
    fs.writeFileSync(article, f.articleRaw); fs.writeFileSync(proposalFile, JSON.stringify(proposal)); fs.writeFileSync(approvalFile, JSON.stringify(approve(proposal)));
    fs.writeFileSync(outputFile, 'preserve'); fs.writeFileSync(learningFile, 'preserve');
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/boat-article-review-cycle.mjs'),
      '--mode','apply','--article',article,'--proposal',proposalFile,'--approval',approvalFile,
      '--commit',commit,'--output',outputFile,'--learning-record',learningFile], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Refusing to overwrite/);
    assert.equal(fs.readFileSync(outputFile, 'utf8'), 'preserve');
    assert.equal(fs.readFileSync(learningFile, 'utf8'), 'preserve');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
