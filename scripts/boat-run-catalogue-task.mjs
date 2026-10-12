#!/usr/bin/env node
/**
 * Dependency-light, read-only, resumable published-catalogue task.
 * Uses only repository-owned audits and Node built-ins; no network or AI calls.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { articles } from '../lib/articles.ts';
import { auditPublishedCatalogue } from './boat-published-catalogue-audit.mjs';
import {
  addTaskFindings, checkpointTask, createTaskRecord, loadTaskRecord,
  saveTaskRecord, transitionTask
} from './boat-task-state.mjs';

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
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
function summary(record, status) {
  return {
    schemaVersion: 1,
    taskId: record.taskId,
    taskType: record.taskType,
    pinnedCommitSha: record.pinnedCommitSha,
    status,
    progress: { completedUnits: record.checkpoint.completedUnits.length, totalArticles: Number(record.config.totalArticles), cursor: record.checkpoint.cursor },
    findings: record.findings.length,
    budget: record.budget,
    limitations: [
      'This task performs a deterministic structural catalogue audit only.',
      'Claim-to-source semantic support, source freshness, source reachability, and factual truth are not assessed.',
      'No network, AI provider, article mutation, publishing, merge, or image-generation call is made.'
    ]
  };
}
async function main() {
  const options = argsFrom(process.argv.slice(2));
  if (options.help) { process.stdout.write(usage()); return; }
  const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const checkedOutCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  if (options.commit !== checkedOutCommit) throw new Error('Input pin mismatch: --commit must equal the checked-out repository commit SHA');
  const dirtyAuditInputs = execFileSync('git', ['status', '--porcelain', '--untracked-files=no', '--', 'lib/articles.ts', 'scripts/boat-published-catalogue-audit.mjs', 'scripts/boat-run-catalogue-task.mjs'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  if (dirtyAuditInputs) throw new Error('Input pin mismatch: audited catalogue or audit code has uncommitted changes');
  const stateDir = path.resolve(options.stateDir);
  await fs.mkdir(stateDir, { recursive: true });
  const duplicateCounts = new Map();
  for (const article of articles) {
    const slug = typeof article?.slug === 'string' ? article.slug : '';
    if (slug) duplicateCounts.set(slug, (duplicateCounts.get(slug) ?? 0) + 1);
  }
  const duplicateSlugs = [...duplicateCounts.entries()].filter(([, count]) => count > 1).map(([slug, count]) => ({ slug, count }));
  let record, filePath, diskRevision;
  if (options.resume) {
    filePath = path.join(stateDir, options.resume + '.json');
    record = await loadTaskRecord(filePath);
    if (record.taskId !== options.resume) throw new Error('Stored task ID does not match requested resume ID');
    if (record.pinnedCommitSha !== options.commit) throw new Error('Resume blocked: supplied commit does not match pinned commit');
    if (record.taskType !== 'published_catalogue_audit' || record.config.batchSize !== options.batchSize || record.config.totalArticles !== articles.length) {
      throw new Error('Resume blocked: task type, batch size, or catalogue size differs from original task configuration');
    }
    diskRevision = record.revision;
    if (record.status === 'completed') {
      process.stdout.write(JSON.stringify(summary(record, record.status), null, 2) + '\n');
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
      config: { batchSize: options.batchSize, totalArticles: articles.length, auditVersion: 1 }
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
      for (const message of batchResults[offset].findings ?? []) findings.push(findingForArticle(record.taskId, article, articleIndex, message));
    }
    if (cursor === 0) {
      for (const duplicate of duplicateSlugs) findings.push({
        findingId: 'F-' + sha256(`${record.taskId}|duplicate-slug|${duplicate.slug}`).slice(0, 24),
        category: 'identity',
        severity: 'high',
        status: 'review_signal',
        articleSlug: duplicate.slug,
        title: 'Duplicate article slug: ' + duplicate.slug,
        description: `The catalogue contains ${duplicate.count} entries for this slug; identity must be resolved before attaching evidence or proposing a repair.`,
        semanticSupport: 'not_assessed',
        requiresApproval: true
      });
    }
    const before = record.revision;
    record = addTaskFindings(record, findings);
    record = checkpointTask(record, {
      cursor: `index:${end}`,
      completedUnitIds: batchArticles.map((article, offset) => `${cursor + offset}:${String(article?.slug ?? '')}`)
    });
    await saveTaskRecord(filePath, record, { expectedRevision: diskRevision });
    diskRevision = record.revision;
    cursor = end;
    batchesThisInvocation++;
  }
  const finalStatus = cursor >= articles.length ? 'completed' : 'paused';
  record = transitionTask(record, finalStatus, { reason: finalStatus === 'paused' ? 'Invocation batch limit reached; resume from saved checkpoint.' : null });
  await saveTaskRecord(filePath, record, { expectedRevision: diskRevision });
  process.stdout.write(JSON.stringify({ ...summary(record, record.status), stateFile: filePath, batchesThisInvocation }, null, 2) + '\n');
}
main().catch(error => {
  process.stderr.write(`BOAT catalogue task failed closed: ${error.message}\n${usage()}`);
  process.exitCode = 1;
});
