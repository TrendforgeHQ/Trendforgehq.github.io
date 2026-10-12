#!/usr/bin/env node
/**
 * Dependency-light, read-only, resumable published-catalogue task.
 * Uses only repository-owned audits and Node built-ins; no network or AI calls.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { articles } from '../lib/articles.ts';
import { auditPublishedCatalogue, auditPublishedEvidenceCoverage, auditPublishedLineageCoverage } from './boat-published-catalogue-audit.mjs';
import { buildPublishedReviewQueue } from './boat-published-review-queue.mjs';
import { auditPublishedClaims } from './boat-published-claim-audit.mjs';
import {
  addTaskFindings, checkpointTask, createTaskRecord, loadTaskRecord,
  saveTaskRecord, transitionTask
} from './boat-task-state.mjs';
import { writeTaskReport } from './boat-render-task-report.mjs';

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const stableJson = value => JSON.stringify(canonical(value));
function usage() {
  return 'Usage: node scripts/boat-run-catalogue-task.mjs --commit <40-char-sha> --state-dir <dir> [--batch-size 1..100] [--max-batches n] [--resume boat_<24-hex>]' + String.fromCharCode(10);
}
function argsFrom(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith('--')) throw new Error('Unexpected argument: ' + key);
    if (key === '--help') { out.help = true; continue; }
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error('Missing value for ' + key);
    const name = ({ '--commit': 'commit', '--state-dir': 'stateDir', '--batch-size': 'batchSize', '--max-batches': 'maxBatches', '--resume': 'resume' })[key];
    if (!name) throw new Error('Unknown option: ' + key);
    if (Object.hasOwn(out, name)) throw new Error('Duplicate option: ' + key);
    out[name] = value;
  }
  if (out.help) return out;
  if (!out.commit || !/^[a-f0-9]{40}$/.test(out.commit)) throw new Error('--commit must be a full 40-character lowercase commit SHA');
  if (!out.stateDir) throw new Error('--state-dir is required; choose a local or ephemeral worker directory explicitly');
  out.batchSize = out.batchSize === undefined ? 25 : Number(out.batchSize);
  out.maxBatches = out.maxBatches === undefined ? Infinity : Number(out.maxBatches);
  if (!Number.isInteger(out.batchSize) || out.batchSize < 1 || out.batchSize > 100) throw new Error('--batch-size must be an integer from 1 to 100');
  if (!(out.maxBatches === Infinity || (Number.isInteger(out.maxBatches) && out.maxBatches >= 1))) throw new Error('--max-batches must be a positive integer');
  if (out.resume && !/^boat_[a-f0-9]{24}$/.test(out.resume)) throw new Error('--resume must be a BOAT task ID');
  return out;
}
function findingForArticle(taskId, article, index, message) {
  const unitId = `${index}:${String(article?.slug ?? '')}`;
  const findingId = 'F-' + sha256(`${taskId}|article|${unitId}|${message}`).slice(0, 24);
  return {
    findingId,
    category: 'structure',
    severity: /duplicate slug/i.test(message) ? 'high' : 'medium',
    status: 'review_signal',
    articleSlug: String(article?.slug ?? ''),
    articleTitle: String(article?.title ?? article?.slug ?? 'Untitled article'),
    articleIndex: index,
    title: message,
    description: 'Deterministic structural finding; this is not semantic fact verification.',
    semanticSupport: 'not_assessed',
    requiresApproval: true
  };
}
function summary(record, status, auditComponents) {
  const findingsByCategory = Object.fromEntries([...new Set(record.findings.map(item => item.category))].sort().map(category => [category, record.findings.filter(item => item.category === category).length]));
  return {
    schemaVersion: 1,
    taskId: record.taskId,
    taskType: record.taskType,
    pinnedCommitSha: record.pinnedCommitSha,
    status,
    progress: { completedUnits: record.checkpoint.completedUnits.length, totalArticles: Number(record.config.totalArticles), cursor: record.checkpoint.cursor },
    findings: record.findings.length,
    findingsByCategory,
    auditComponents,
    budget: record.budget,
    limitations: [
      'This task combines deterministic structure, archived evidence coverage, exact-byte lineage, and archived claim-verifier metadata into a read-only review queue.',
      'Claim-to-source semantic support, source freshness, source reachability, and factual truth are not independently assessed; historical verifier results are signals only.',
      'No network, AI provider, article mutation, publishing, merge, or image-generation call is made.'
    ]
  };
}
async function main() {
  const options = argsFrom(process.argv.slice(2));
  if (options.help) { process.stdout.write(usage()); return; }
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const checkedOutCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  if (options.commit !== checkedOutCommit) throw new Error('Input pin mismatch: --commit must equal the checked-out repository commit SHA');
  const auditInputPaths = ['lib/articles.ts', 'content/articles', 'data/article-attempts', 'data/published-lineage', 'data/claim-verification.json', 'data/metadata.json', 'scripts/boat-published-catalogue-audit.mjs', 'scripts/boat-published-review-queue.mjs', 'scripts/boat-published-claim-audit.mjs', 'scripts/boat-run-catalogue-task.mjs'];
  const dirtyAuditInputs = execFileSync('git', ['status', '--porcelain', '--untracked-files=all', '--', ...auditInputPaths], { cwd: repoRoot, encoding: 'utf8' }).trim();
  if (dirtyAuditInputs) throw new Error('Input pin mismatch: catalogue, evidence, lineage, claim reports, or audit code has uncommitted changes');
  const stateDir = path.resolve(options.stateDir);
  await fs.mkdir(stateDir, { recursive: true });
  const duplicateCounts = new Map();
  for (const article of articles) {
    const slug = typeof article?.slug === 'string' ? article.slug : '';
    if (slug) duplicateCounts.set(slug, (duplicateCounts.get(slug) ?? 0) + 1);
  }
  const duplicateSlugs = [...duplicateCounts.entries()].filter(([, count]) => count > 1).map(([slug, count]) => ({ slug, count }));
  const root = repoRoot;
  const attemptsDirectory = path.join(root, 'data', 'article-attempts');
  const articlesDirectory = path.join(root, 'content', 'articles');
  const lineageDirectory = path.join(root, 'data', 'published-lineage');
  const structural = auditPublishedCatalogue(articles);
  const evidence = auditPublishedEvidenceCoverage(articles, attemptsDirectory);
  const lineage = auditPublishedLineageCoverage(articles, articlesDirectory, lineageDirectory);
  const reviewQueue = buildPublishedReviewQueue({ articles, structural, evidence, lineage, duplicateSlugs });
  const claimAudit = auditPublishedClaims({ articles, attemptsDirectory, articlesDirectory, rootReportPath: path.join(root, 'data', 'claim-verification.json'), rootMetadataPath: path.join(root, 'data', 'metadata.json') });
  const reviewByIdentity = new Map(reviewQueue.articles.map(item => [`${item.slug}\\0${item.title}`, item]));
  const claimsBySlug = new Map(claimAudit.articles.map(item => [item.slug, item]));
  const auditComponents = { structuralArticles: structural.length, evidenceArticles: evidence.length, lineageArticles: lineage.length, reviewQueueArticles: reviewQueue.articles.length, claimAuditArticles: claimAudit.articles.length, archivedClaimReports: claimAudit.summary.archivedReports, archivedClaimRows: claimAudit.summary.claims, historicalUnsupportedSignals: claimAudit.summary.unsupported, historicalContradictedSignals: claimAudit.summary.contradicted, historicalNumericMismatchSignals: claimAudit.summary.numericMismatch, reviewQueueReadOnly: reviewQueue.readOnly, automaticRepair: reviewQueue.automaticRepair, automaticPublicationDecision: reviewQueue.automaticPublicationDecision, reviewQueueSummary: reviewQueue.summary, claimAuditSummary: claimAudit.summary };
  let record, filePath, diskRevision;
  if (options.resume) {
    filePath = path.join(stateDir, options.resume + '.json');
    record = await loadTaskRecord(filePath);
    if (record.taskId !== options.resume) throw new Error('Stored task ID does not match requested resume ID');
    if (record.pinnedCommitSha !== options.commit) throw new Error('Resume blocked: supplied commit does not match pinned commit');
    if (record.taskType !== 'published_catalogue_audit' || record.config.batchSize !== options.batchSize || record.config.totalArticles !== articles.length || record.config.auditVersion !== 3 || record.config.auditProfile !== 'combined-structural-evidence-lineage-claim-history' || stableJson(record.config.auditComponents) !== stableJson(auditComponents)) {
      throw new Error('Resume blocked: task type, batch size, or catalogue size differs from original task configuration');
    }
    diskRevision = record.revision;
    if (record.status === 'completed') {
      const reportFile = filePath.replace(/\.json$/i, '.md');
      await writeTaskReport(reportFile, record);
      process.stdout.write(JSON.stringify({ ...summary(record, record.status, auditComponents), stateFile: filePath, reportFile, batchesThisInvocation: 0 }, null, 2) + '\n');
      return;
    }
    if (!['paused', 'running', 'queued'].includes(record.status)) throw new Error('Resume blocked for task status: ' + record.status);
    if (record.status !== 'running') {
      record = transitionTask(record, 'running');
      await saveTaskRecord(filePath, record, { expectedRevision: diskRevision });
      diskRevision = record.revision;
    }
  } else {
    record = createTaskRecord({
      taskType: 'published_catalogue_audit',
      pinnedCommitSha: options.commit,
      config: { batchSize: options.batchSize, totalArticles: articles.length, auditVersion: 3, auditProfile: 'combined-structural-evidence-lineage-claim-history', auditComponents }
    });
    filePath = path.join(stateDir, record.taskId + '.json');
    await saveTaskRecord(filePath, record, { expectedRevision: null });
    diskRevision = record.revision;
    record = transitionTask(record, 'running');
    await saveTaskRecord(filePath, record, { expectedRevision: diskRevision });
    diskRevision = record.revision;
  }

  let cursor = 0;
  if (record.checkpoint.cursor !== null) {
    const match = /^index:(\d+)$/.exec(String(record.checkpoint.cursor));
    if (!match) throw new Error('Resume blocked: checkpoint cursor is malformed');
    cursor = Number(match[1]);
  }
  if (!Number.isInteger(cursor) || cursor < 0 || cursor > articles.length) throw new Error('Resume blocked: checkpoint cursor is outside catalogue bounds');
  let batchesThisInvocation = 0;
  while (cursor < articles.length && batchesThisInvocation < options.maxBatches) {
    const end = Math.min(cursor + options.batchSize, articles.length);
    const batchArticles = articles.slice(cursor, end);
    const batchResults = auditPublishedCatalogue(batchArticles);
    const findings = [];
    for (let offset = 0; offset < batchResults.length; offset++) {
      const articleIndex = cursor + offset;
      const article = batchArticles[offset];
      const slug = String(article?.slug ?? '');
      const title = String(article?.title ?? slug ?? 'Untitled article');
      const queueRecord = reviewByIdentity.get(`${slug}\\0${title}`);
      if (!queueRecord) {
        findings.push({ findingId: 'F-' + sha256(`${record.taskId}|missing-review-record|${articleIndex}|${slug}`).slice(0, 24), category: 'audit_integrity', severity: 'high', status: 'blocked', articleSlug: slug, articleTitle: title, title: 'Combined review record missing', description: 'The combined review queue did not produce a record for this catalogue entry; no clean result can be inferred.', semanticSupport: 'unknown', requiresApproval: true });
      } else {
        for (const reason of queueRecord.reasons) {
          const category = /duplicate slug/i.test(reason) ? 'identity' : /historical claim|claim-verification|evidence/i.test(reason) ? 'evidence_history' : /lineage|manifest|hash/i.test(reason) ? 'lineage' : 'structure';
          const findingId = 'F-' + sha256(`${record.taskId}|queue|${articleIndex}|${slug}|${reason}`).slice(0, 24);
          findings.push({ findingId, category, severity: queueRecord.priority === 'high' ? 'high' : queueRecord.priority === 'medium' ? 'medium' : 'low', status: 'review_signal', articleSlug: slug, articleTitle: title, articleIndex, title: reason, description: queueRecord.suggestedActions.join(' '), reviewPriority: queueRecord.priority, structural: queueRecord.structural, evidence: queueRecord.evidence, lineage: queueRecord.lineage, semanticSupport: 'not_assessed', requiresApproval: true });
        }
      }
      const claimRecord = claimsBySlug.get(slug);
      if (claimRecord) {
        for (const report of claimRecord.reports ?? []) {
          for (const claim of report.claims ?? []) {
            const flags = claim.flags ?? {};
            const issue = flags.contradicted ? 'historical-contradicted-signal' : flags.numericMismatch ? 'historical-numeric-mismatch-signal' : flags.unsupported ? 'historical-unsupported-signal' : claim.reviewStatus === 'unknown' ? 'claim-context-unknown' : claim.currentArticleTextStatus?.startsWith('not-exactly-found') ? 'claim-text-not-exactly-found' : claim.sourceContextStatus !== 'fields-present-not-validated' ? 'claim-source-context-incomplete' : 'historical-claim-signal-requires-semantic-review';
            const findingId = 'F-' + sha256(`${record.taskId}|claim|${articleIndex}|${report.attemptId}|${claim.claimIndex}|${issue}`).slice(0, 24);
            const severity = flags.contradicted || flags.numericMismatch || flags.unsupported ? 'high' : claim.reviewStatus === 'unknown' || claim.sourceContextStatus !== 'fields-present-not-validated' ? 'medium' : 'low';
            findings.push({ findingId, category: 'claim_history', severity, status: flags.contradicted || flags.numericMismatch || flags.unsupported ? 'review_required' : claim.reviewStatus === 'unknown' ? 'unknown' : 'historical_signal_only', articleSlug: slug, articleTitle: title, articleIndex, title: issue, description: 'Archived verifier metadata only; current source reachability, freshness, passage identity, and semantic support have not been independently checked.', claim: { index: claim.claimIndex, text: claim.claimText, savedVerifierStatus: claim.savedVerifierStatus, classification: claim.classification, flags, currentArticleTextStatus: claim.currentArticleTextStatus, sourceContextStatus: claim.sourceContextStatus, source: claim.source, passages: (claim.passages ?? []).map(passage => ({ id: passage.id, excerpt: typeof passage.excerpt === 'string' ? passage.excerpt.slice(0, 300) : null })), report: { attemptId: report.attemptId, sourceKind: report.sourceKind, workflowRun: report.workflowRun, workflowSha: report.workflowSha, reportPath: report.reportPath, reportSha256: report.reportSha256, historicalPass: report.reportPass }, currentArticleSha256: claimRecord.currentArticleSha256 }, semanticSupport: 'not_assessed', requiresApproval: true });
          }
        }
      }
      for (const message of batchResults[offset].findings ?? []) {
        if (!queueRecord?.reasons.includes(message)) findings.push(findingForArticle(record.taskId, article, articleIndex, message));
      }
    }
    record = addTaskFindings(record, findings);
    record = checkpointTask(record, {
      cursor: `index:${end}`,
      completedUnitIds: batchArticles.map((article, offset) => `${cursor + offset}:${String(article?.slug ?? '')}`)
    });
    await saveTaskRecord(filePath, record, { expectedRevision: diskRevision });
    diskRevision = record.revision;
    await writeTaskReport(filePath.replace(/\.json$/i, '.md'), record);
    cursor = end;
    batchesThisInvocation++;
  }
  const finalStatus = cursor >= articles.length ? 'completed' : 'paused';
  record = transitionTask(record, finalStatus, { reason: finalStatus === 'paused' ? 'Invocation batch limit reached; resume from saved checkpoint.' : null });
  await saveTaskRecord(filePath, record, { expectedRevision: diskRevision });
  const reportFile = filePath.replace(/\.json$/i, '.md');
  await writeTaskReport(reportFile, record);
  process.stdout.write(JSON.stringify({ ...summary(record, record.status, auditComponents), stateFile: filePath, reportFile, batchesThisInvocation }, null, 2) + '\n');
}
main().catch(error => {
  process.stderr.write(`BOAT catalogue task failed closed: ${error.message}\n${usage()}`);
  process.exitCode = 1;
});
