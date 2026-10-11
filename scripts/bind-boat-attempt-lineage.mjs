#!/usr/bin/env node
/**
 * Bind a generated article, verifier report, and canonical evidence-pack bytes to one workflow run.
 * Read-only for published content; updates only the generated attempt archive metadata.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(file);
const parse = (bytes, label) => {
  try { return JSON.parse(bytes.toString('utf8')); }
  catch { throw new Error(label + ' is not valid JSON'); }
};

export function bindAttemptLineage({ root = process.cwd(), runId, workflowSha }) {
  if (!/^\d+$/.test(String(runId ?? ''))) throw new Error('workflow run ID is missing or invalid');
  if (!/^[0-9a-f]{40}$/i.test(String(workflowSha ?? ''))) throw new Error('workflow SHA is missing or invalid');
  const markerBytes = read(path.join(root, 'data/current-run-article.json'));
  const marker = parse(markerBytes, 'current-run article marker');
  if (marker.generated !== true) return { status: 'skipped-no-article', runId: String(runId) };
  const articlePath = String(marker.articlePath ?? '');
  if (!/^content\/articles\/[A-Za-z0-9._-]+\.md$/.test(articlePath) || articlePath.includes('..')) {
    throw new Error('current-run article path is invalid');
  }
  const reportBytes = read(path.join(root, 'data/claim-verification.json'));
  const packBytes = read(path.join(root, 'data/authoritative-evidence-pack.json'));
  const report = parse(reportBytes, 'claim-verification report');
  if (String(report.articlePath ?? '').replace(/^\.\//, '') !== articlePath) {
    throw new Error('claim report articlePath does not match current-run article');
  }
  const articleBytes = read(path.join(root, articlePath));
  const attemptsRoot = path.join(root, 'data/article-attempts');
  const matches = [];
  if (fs.existsSync(attemptsRoot)) {
    for (const entry of fs.readdirSync(attemptsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(attemptsRoot, entry.name);
      const metaPath = path.join(dir, 'metadata.json');
      const archivedArticle = path.join(dir, 'article.md');
      const archivedPack = path.join(dir, 'authoritative-evidence-pack.json');
      if (![metaPath, archivedArticle, archivedPack].every(fs.existsSync)) continue;
      let metadata;
      try { metadata = parse(read(metaPath), 'attempt metadata'); } catch { continue; }
      if (String(metadata.workflowRun ?? '') !== String(runId)) continue;
      if (String(metadata.articlePath ?? '').replace(/^\.\//, '') !== articlePath) continue;
      if (sha256(read(archivedArticle)) !== sha256(articleBytes)) continue;
      if (sha256(read(archivedPack)) !== sha256(packBytes)) continue;
      matches.push({ dir, metaPath, metadata });
    }
  }
  if (matches.length !== 1) {
    throw new Error('expected exactly one same-run archive matching article and evidence-pack bytes; found ' + matches.length);
  }
  const { metaPath, metadata } = matches[0];
  fs.writeFileSync(path.join(matches[0].dir, 'claim-verification.json'), reportBytes);
  const updated = {
    ...metadata,
    status: report.pass === true ? 'claim-verification-pass-recorded' : 'claim-verification-not-pass',
    workflowRun: String(runId),
    workflowSha: String(workflowSha).toLowerCase(),
    articleSha256: sha256(articleBytes),
    claimReportSha256: sha256(reportBytes),
    evidencePackSha256: sha256(packBytes),
    hashesRecordedInWorkflow: true,
    claimReportPassRecorded: report.pass === true,
    semanticFactualSupport: 'not_assessed',
    lineageBindingVersion: 1
  };
  fs.writeFileSync(metaPath, JSON.stringify(updated, null, 2) + '\n');
  return { status: 'bound', runId: String(runId), articlePath, articleSha256: updated.articleSha256, claimReportSha256: updated.claimReportSha256, evidencePackSha256: updated.evidencePackSha256, claimReportPassRecorded: updated.claimReportPassRecorded, archiveDirectory: path.relative(root, matches[0].dir) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  try {
    const result = bindAttemptLineage({ runId: process.env.GITHUB_RUN_ID, workflowSha: process.env.GITHUB_SHA });
    console.log('BOAT attempt lineage binding:', JSON.stringify(result));
  } catch (error) {
    console.error('BOAT attempt lineage binding failed closed:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
