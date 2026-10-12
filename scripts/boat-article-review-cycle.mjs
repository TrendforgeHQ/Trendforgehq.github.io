#!/usr/bin/env node
/**
 * BOAT's offline one-article vertical slice.
 * Audits exact input bytes, creates an immutable structural-repair proposal,
 * and only emits a verified candidate after an explicit hash-bound approval.
 * It never writes to content/articles, publishes, fetches URLs, or calls AI.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { analyzeArticle } from './boat-article-doctor.mjs';
import { auditEvidenceLineage } from './boat-evidence-auditor.mjs';
import { proposeStructuralRepairs } from './boat-repair-engine.mjs';

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
const stableJson = value => JSON.stringify(canonical(value));
const isSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const isIsoDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const safeArticlePath = value => typeof value === 'string' && /^content\/articles\/[A-Za-z0-9._-]+\.md$/.test(value) && !value.includes('..') && !value.includes('\\');

function parseJson(raw, label) {
  try { return JSON.parse(raw); }
  catch (error) { throw new Error(`Invalid ${label} JSON: ${error.message}`); }
}
function proposalHash(proposal) {
  const { proposalHash: ignored, ...core } = proposal;
  return sha256(stableJson(core));
}
function validateProposal(proposal) {
  if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) throw new Error('Proposal must be a JSON object');
  if (proposal.schemaVersion !== 1 || proposal.engine !== 'BOAT Article Review Cycle') throw new Error('Unsupported proposal schema/engine');
  if (!safeArticlePath(proposal.targetPath)) throw new Error('Proposal targetPath is not an allowlisted article path');
  if (!isSha(proposal.baseCommitSha) || !isHash(proposal.beforeSha256) || !isHash(proposal.afterSha256)) throw new Error('Proposal commit/hash fields are invalid');
  if (typeof proposal.proposedMarkdown !== 'string' || !Array.isArray(proposal.changes)) throw new Error('Proposal content or change list is invalid');
  if (proposal.proposalHash !== proposalHash(proposal)) throw new Error('Proposal hash does not match its exact contents');
  return true;
}

export function createArticleReviewCycle({
  articleRaw, articlePath, claimReportRaw, evidencePackRaw, metadataRaw,
  baseCommitSha, generatedAt = '2000-01-01T00:00:00.000Z'
} = {}) {
  if (typeof articleRaw !== 'string' || typeof claimReportRaw !== 'string' ||
      typeof evidencePackRaw !== 'string' || typeof metadataRaw !== 'string') {
    throw new Error('Exact article, claim-report, evidence-pack, and metadata bytes are required');
  }
  if (!safeArticlePath(articlePath)) throw new Error('articlePath must be content/articles/<safe-slug>.md');
  if (!isSha(baseCommitSha)) throw new Error('baseCommitSha must be a full lowercase 40-character commit SHA');
  if (!isIsoDate(generatedAt)) throw new Error('generatedAt must be a valid date-time');
  const claimReport = parseJson(claimReportRaw, 'claim report');
  const evidencePack = parseJson(evidencePackRaw, 'evidence pack');
  const metadata = parseJson(metadataRaw, 'run metadata');

  const doctor = analyzeArticle({
    articleText: articleRaw, articlePath,
    report: claimReport, reportPath: 'claim-verification.json',
    metadata, metadataPath: 'metadata.json',
    expectedWorkflowRun: metadata.workflowRun ?? null, generatedAt
  });
  const evidenceAudit = auditEvidenceLineage({
    claimReport, evidencePack, metadata,
    claimReportRaw, evidencePackRaw,
    claimReportPath: 'claim-verification.json',
    evidencePackPath: 'authoritative-evidence-pack.json',
    metadataPath: 'metadata.json', generatedAt
  });
  const repair = proposeStructuralRepairs(articleRaw);
  const integrityUnknown = doctor.summary.status === 'unknown' || evidenceAudit.status === 'unknown';
  const status = integrityUnknown ? 'blocked' : repair.changed ? 'review_required' : 'no_change';
  const core = {
    schemaVersion: 1,
    engine: 'BOAT Article Review Cycle',
    mode: 'offline-proposal-only',
    status,
    generatedAt,
    targetPath: articlePath,
    baseCommitSha,
    beforeSha256: sha256(articleRaw),
    afterSha256: repair.afterSha256,
    changed: repair.changed,
    changes: repair.changes,
    proposedMarkdown: repair.repairedMarkdown,
    articleDoctor: { reportId: doctor.reportId, status: doctor.summary.status, findingCount: doctor.summary.findingCount },
    evidenceAudit: { status: evidenceAudit.status, findingCount: evidenceAudit.summary.findingCount, integrityFindingCount: evidenceAudit.summary.integrityFindingCount },
    approvalRequired: true,
    automaticApplication: false,
    semanticSupport: 'not_verified',
    limitations: [
      'Article Doctor and Evidence Auditor inspect supplied artifacts; they do not independently prove factual truth, source freshness, or semantic claim support.',
      'Only exact duplicate plain-text paragraphs and empty Markdown headings outside protected regions are proposed for structural repair.',
      'The original article is never changed by this workflow; approval only permits writing a new sandbox candidate outside content/articles.',
      'This local approval record is not authentication or a live Control Center authorization mechanism.',
      'The existing claim verifier and editorial/build gates must still be rerun before a human considers publication.'
    ]
  };
  const proposal = { ...core, proposalHash: proposalHash(core) };
  const review = {
    schemaVersion: 1, engine: 'BOAT Article Review Cycle', mode: 'offline-read-only',
    generatedAt, baseCommitSha, targetPath: articlePath,
    inputHashes: { articleSha256: sha256(articleRaw), claimReportSha256: sha256(claimReportRaw), evidencePackSha256: sha256(evidencePackRaw), metadataSha256: sha256(metadataRaw) },
    articleDoctor: doctor, evidenceAudit,
    repairProposal: { status, proposalHash: proposal.proposalHash, changed: repair.changed, changes: repair.changes, beforeSha256: repair.beforeSha256, afterSha256: repair.afterSha256 },
    approvalRequired: true, automaticApplication: false, publicationDecision: 'not_made',
    learning: { status: 'awaiting_human_decision', decision: null, proposalHash: proposal.proposalHash },
    limitations: proposal.limitations
  };
  return { review, proposal };
}

export function applyApprovedRepair({ proposal, approval, currentArticleRaw, currentCommitSha, appliedAt = '2000-01-01T00:00:00.000Z' } = {}) {
  validateProposal(proposal);
  if (proposal.status !== 'review_required' || proposal.changed !== true) throw new Error('Only a changed review_required proposal can be applied');
  if (typeof currentArticleRaw !== 'string') throw new Error('Exact current article bytes are required');
  if (!isSha(currentCommitSha) || currentCommitSha !== proposal.baseCommitSha) throw new Error('Current commit differs from the proposal base commit');
  if (sha256(currentArticleRaw) !== proposal.beforeSha256) throw new Error('Current article bytes differ from the approved proposal base');
  if (!approval || typeof approval !== 'object' || Array.isArray(approval)) throw new Error('An explicit approval record is required');
  const allowedKeys = ['schemaVersion','decision','proposalHash','baseCommitSha','targetPath','beforeSha256','afterSha256','approvedBy','approvedAt','rationale'];
  if (Object.keys(approval).some(key => !allowedKeys.includes(key))) throw new Error('Approval contains unsupported fields');
  if (approval.schemaVersion !== 1 || approval.decision !== 'approve') throw new Error('Approval decision must explicitly be approve');
  for (const key of ['proposalHash','baseCommitSha','targetPath','beforeSha256','afterSha256']) {
    if (approval[key] !== proposal[key]) throw new Error(`Approval binding mismatch: ${key}`);
  }
  if (typeof approval.approvedBy !== 'string' || !approval.approvedBy.trim()) throw new Error('Approval must identify the reviewer');
  if (typeof approval.rationale !== 'string' || !approval.rationale.trim()) throw new Error('Approval rationale is required');
  if (!isIsoDate(approval.approvedAt) || !isIsoDate(appliedAt) || Date.parse(approval.approvedAt) > Date.parse(appliedAt)) throw new Error('Approval/apply timestamps are invalid or out of order');
  if (sha256(proposal.proposedMarkdown) !== proposal.afterSha256) throw new Error('Proposed output bytes do not match the approved after-hash');
  const verification = proposeStructuralRepairs(proposal.proposedMarkdown);
  if (verification.changed) throw new Error('Post-fix structural verification failed: eligible structural changes remain');
  const learningRecord = {
    schemaVersion: 1, recordType: 'boat-repair-learning',
    recordedAt: appliedAt, decision: 'approved',
    reviewer: approval.approvedBy.trim(), rationale: approval.rationale.trim(),
    proposalHash: proposal.proposalHash, baseCommitSha: proposal.baseCommitSha,
    targetPath: proposal.targetPath, beforeSha256: proposal.beforeSha256,
    afterSha256: proposal.afterSha256, proposedChangeCount: proposal.changes.length,
    verification: {
      structuralRepairIdempotent: true, remainingEligibleStructuralChanges: 0,
      originalArticleUnchangedByExecutor: true, semanticSupport: 'not_verified',
      claimVerifierRerun: false, publicationDecision: 'not_made'
    },
    outcome: 'sandbox_candidate_verified_not_published'
  };
  return { candidateMarkdown: proposal.proposedMarkdown, candidateSha256: sha256(proposal.proposedMarkdown), learningRecord };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (!flag.startsWith('--')) throw new Error('Unexpected argument: ' + flag);
    if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Missing value for ' + flag);
    const key = flag.slice(2);
    if (Object.hasOwn(args, key)) throw new Error('Duplicate argument: ' + flag);
    args[key] = argv[++i];
  }
  return args;
}
function writeNew(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, { flag: 'wx', mode: 0o600 });
}
function readJsonFile(filePath, label) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return { raw, value: parseJson(raw, label) };
}
export function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  if (args.mode === 'audit') {
    for (const key of ['article','report','pack','metadata','commit','output-dir']) if (!args[key]) throw new Error('Audit mode requires --article --report --pack --metadata --commit --output-dir');
    const articlePath = path.resolve(args.article);
    const articleRaw = fs.readFileSync(articlePath, 'utf8');
    const report = readJsonFile(path.resolve(args.report), 'claim report');
    const pack = readJsonFile(path.resolve(args.pack), 'evidence pack');
    const metadata = readJsonFile(path.resolve(args.metadata), 'run metadata');
    const targetPath = args['target-path'];
    if (!targetPath) throw new Error('Audit mode requires --target-path content/articles/<slug>.md');
    const result = createArticleReviewCycle({
      articleRaw, articlePath: targetPath, claimReportRaw: report.raw,
      evidencePackRaw: pack.raw, metadataRaw: metadata.raw,
      baseCommitSha: args.commit, generatedAt: new Date().toISOString()
    });
    const outDir = path.resolve(args['output-dir']);
    if (outDir === root || outDir.startsWith(path.join(root, 'content/articles') + path.sep) || outDir === path.join(root, 'content/articles')) {
      throw new Error('Audit output directory must not be the repository root or inside content/articles');
    }
    writeNew(path.join(outDir, 'review.json'), JSON.stringify(result.review, null, 2) + '\n');
    writeNew(path.join(outDir, 'repair-proposal.json'), JSON.stringify(result.proposal, null, 2) + '\n');
    process.stdout.write(JSON.stringify({ status: result.proposal.status, targetPath, proposalHash: result.proposal.proposalHash, findingCount: result.review.articleDoctor.summary.findingCount + result.review.evidenceAudit.summary.findingCount, outputDir: outDir, automaticApplication: false }) + '\n');
    return result.proposal.status === 'blocked' ? 2 : 0;
  }
  if (args.mode === 'apply') {
    for (const key of ['article','proposal','approval','commit','output','learning-record']) if (!args[key]) throw new Error('Apply mode requires --article --proposal --approval --commit --output --learning-record');
    const articlePath = path.resolve(args.article);
    const proposalPath = path.resolve(args.proposal);
    const approvalPath = path.resolve(args.approval);
    const outputPath = path.resolve(args.output);
    const learningPath = path.resolve(args['learning-record']);
    if ([articlePath, proposalPath, approvalPath].includes(outputPath) || outputPath === learningPath) throw new Error('Output paths must be distinct from inputs and each other');
    const articleRaw = fs.readFileSync(articlePath, 'utf8');
    const proposal = readJsonFile(proposalPath, 'repair proposal').value;
    const approval = readJsonFile(approvalPath, 'approval').value;
    const result = applyApprovedRepair({ proposal, approval, currentArticleRaw: articleRaw, currentCommitSha: args.commit, appliedAt: new Date().toISOString() });
    const articleRoot = path.resolve(root, 'content/articles') + path.sep;
    if (outputPath.startsWith(articleRoot)) throw new Error('Refusing to write a candidate into the published content/articles directory');
    if (fs.existsSync(outputPath) || fs.existsSync(learningPath)) throw new Error('Refusing to overwrite candidate or learning record');
    writeNew(outputPath, result.candidateMarkdown);
    try { writeNew(learningPath, JSON.stringify(result.learningRecord, null, 2) + '\n'); }
    catch (error) { fs.rmSync(outputPath, { force: true }); throw error; }
    process.stdout.write(JSON.stringify({ status: 'candidate_verified', outputPath, candidateSha256: result.candidateSha256, learningRecord: learningPath, published: false, originalArticleChanged: false }) + '\n');
    return 0;
  }
  throw new Error('Required --mode audit or --mode apply');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.exitCode = runCli(); }
  catch (error) { process.stderr.write('BOAT Article Review Cycle error: ' + error.message + '\n'); process.exitCode = 2; }
}
