#!/usr/bin/env node
/** Bind the final claim report to the exact generated article/evidence-pack archive for one workflow run. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const text = value => typeof value === 'string' ? value.trim() : '';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const readJson = file => {
  try { const raw = fs.readFileSync(file, 'utf8'); return { raw, value: JSON.parse(raw) }; }
  catch { return null; }
};
const articleTitle = raw => {
  const match = String(raw ?? '').match(/^title:\s*["']([\s\S]*?)["']\s*$/m);
  return match ? text(match[1]) : '';
};

export function bindAttemptLineage({ root, runId, workflowSha = '', boundAt = new Date().toISOString() } = {}) {
  if (!root || !text(runId)) return { status: 'unknown-run-context', bound: 0, conflicts: 0, skipped: 0, findings: ['root and workflow run ID are required'] };
  const dataDir = path.join(root, 'data');
  const reportPath = path.join(dataDir, 'claim-verification.json');
  const reportFile = readJson(reportPath);
  const report = reportFile?.value;
  if (!report || !Array.isArray(report.claims) || !text(report.articlePath) || report.status === 'skipped') {
    return { status: 'unknown-claim-report', bound: 0, conflicts: 0, skipped: 0, findings: ['claim report missing, malformed, skipped, or not tied to an article path'] };
  }
  const normalizedArticlePath = text(report.articlePath).replace(/^\.\//, '');
  if (!normalizedArticlePath.startsWith('content/articles/') || normalizedArticlePath.includes('..')) {
    return { status: 'invalid-article-path', bound: 0, conflicts: 0, skipped: 0, findings: ['claim report articlePath is outside content/articles'] };
  }
  const articlePath = path.join(root, normalizedArticlePath);
  const currentArticleRaw = fs.existsSync(articlePath) ? fs.readFileSync(articlePath, 'utf8') : null;
  const packPath = path.join(dataDir, 'authoritative-evidence-pack.json');
  const currentPackRaw = fs.existsSync(packPath) ? fs.readFileSync(packPath, 'utf8') : null;
  const packFile = typeof currentPackRaw === 'string' ? (() => { try { return JSON.parse(currentPackRaw); } catch { return null; } })() : null;
  if (typeof currentArticleRaw !== 'string' || articleTitle(currentArticleRaw) !== text(report.articleTitle)) {
    return { status: 'unknown-current-article-mismatch', bound: 0, conflicts: 0, skipped: 0, findings: ['current article bytes do not match claim report articleTitle'] };
  }
  if (typeof currentPackRaw !== 'string' || !packFile || packFile.version !== 1 || packFile.status !== 'authoritative' || !Array.isArray(packFile.candidates)) {
    return { status: 'unknown-canonical-pack-invalid', bound: 0, conflicts: 0, skipped: 0, findings: ['canonical evidence pack is missing, invalid, or not the expected envelope'] };
  }
  const attemptsDir = path.join(dataDir, 'article-attempts');
  if (!fs.existsSync(attemptsDir)) return { status: 'unknown-attempt-archive-missing', bound: 0, conflicts: 0, skipped: 0, findings: ['article-attempts directory does not exist'] };
  const results = { status: 'no-run-matched-attempt', bound: 0, conflicts: 0, skipped: 0, findings: [] };
  for (const dirent of fs.readdirSync(attemptsDir, { withFileTypes: true }).filter(item => item.isDirectory())) {
    const attemptDir = path.join(attemptsDir, dirent.name);
    const metaPath = path.join(attemptDir, 'metadata.json');
    const metaFile = readJson(metaPath);
    const meta = metaFile?.value;
    if (!meta || text(meta.workflowRun) !== text(runId) || text(meta.articlePath).replace(/^\.\//, '') !== normalizedArticlePath) continue;
    const archivedArticlePath = path.join(attemptDir, 'article.md');
    const archivedPackPath = path.join(attemptDir, 'authoritative-evidence-pack.json');
    if (!fs.existsSync(archivedArticlePath) || !fs.existsSync(archivedPackPath)) {
      results.skipped++;
      results.findings.push({ directory: dirent.name, reason: 'article or evidence-pack archive is missing' });
      continue;
    }
    const archivedArticleRaw = fs.readFileSync(archivedArticlePath, 'utf8');
    const archivedPackRaw = fs.readFileSync(archivedPackPath, 'utf8');
    if (sha256(archivedArticleRaw) !== sha256(currentArticleRaw) || sha256(archivedPackRaw) !== sha256(currentPackRaw)) {
      results.skipped++;
      results.findings.push({ directory: dirent.name, reason: 'archived article/evidence-pack bytes do not match current run bytes' });
      continue;
    }
    const archivedReportPath = path.join(attemptDir, 'claim-verification.json');
    if (fs.existsSync(archivedReportPath)) {
      const existingRaw = fs.readFileSync(archivedReportPath, 'utf8');
      if (sha256(existingRaw) !== sha256(reportFile.raw)) {
        results.conflicts++;
        results.findings.push({ directory: dirent.name, reason: 'existing archived claim report differs; preserved without overwrite' });
        continue;
      }
    } else {
      fs.writeFileSync(archivedReportPath, reportFile.raw);
    }
    const updated = {
      ...meta,
      status: report.pass === true ? 'claim-verification-pass-bound' : 'claim-verification-not-pass-bound',
      articleSha256: sha256(archivedArticleRaw),
      evidencePackSha256: sha256(archivedPackRaw),
      claimReportSha256: sha256(reportFile.raw),
      claimReportArticlePath: normalizedArticlePath,
      claimReportGeneratedAt: text(report.generatedAt) || null,
      claimVerificationPass: report.pass === true,
      claimVerificationStatus: text(report.status) || (report.pass === true ? 'pass' : 'not-pass'),
      hashesRecordedInWorkflow: true,
      lineageBindingVersion: 1,
      lineageBoundAt: boundAt
    };
    fs.writeFileSync(metaPath, JSON.stringify(updated, null, 2) + '\n');
    results.bound++;
    results.findings.push({ directory: dirent.name, reason: 'exact article, pack and claim-report bytes bound to this workflow run', articleSha256: updated.articleSha256, evidencePackSha256: updated.evidencePackSha256, claimReportSha256: updated.claimReportSha256 });
  }
  if (results.bound > 0 && results.conflicts === 0 && results.skipped === 0) results.status = 'bound';
  else if (results.bound > 0) results.status = 'partially-bound';
  return results;
}

function main() {
  const root = path.resolve(process.env.BOAT_AUDIT_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
  const result = bindAttemptLineage({ root, runId: process.env.GITHUB_RUN_ID, workflowSha: process.env.GITHUB_SHA });
  process.stdout.write(JSON.stringify(result, null, 2) + String.fromCharCode(10));
  if (result.status.startsWith('invalid-')) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
