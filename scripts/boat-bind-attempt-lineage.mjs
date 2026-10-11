#!/usr/bin/env node
/** Create an immutable final attempt bundle binding article, evidence pack and claim report to one workflow run. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
const safeName = value => String(value).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'attempt';

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
  const packPath = path.join(dataDir, 'authoritative-evidence-pack.json');
  const currentPackRaw = fs.existsSync(packPath) ? fs.readFileSync(packPath, 'utf8') : null;
  let pack;
  try { pack = typeof currentPackRaw === 'string' ? JSON.parse(currentPackRaw) : null; } catch { pack = null; }
  if (typeof currentPackRaw !== 'string' || !pack || pack.version !== 1 || pack.status !== 'authoritative' || !Array.isArray(pack.candidates)) {
    return { status: 'unknown-canonical-pack-invalid', bound: 0, conflicts: 0, skipped: 0, findings: ['canonical evidence pack is missing, invalid, or not the expected envelope'] };
  }
  const attemptsDir = path.join(dataDir, 'article-attempts');
  if (!fs.existsSync(attemptsDir)) return { status: 'unknown-attempt-archive-missing', bound: 0, conflicts: 0, skipped: 0, findings: ['article-attempts directory does not exist'] };
  const currentArticlePath = path.join(root, normalizedArticlePath);
  let finalArticleRaw = fs.existsSync(currentArticlePath) ? fs.readFileSync(currentArticlePath, 'utf8') : null;
  const matchingDirs = [];
  for (const dirent of fs.readdirSync(attemptsDir, { withFileTypes: true }).filter(item => item.isDirectory())) {
    const attemptDir = path.join(attemptsDir, dirent.name);
    const metaFile = readJson(path.join(attemptDir, 'metadata.json'));
    const meta = metaFile?.value;
    if (!meta || meta.lineageBindingVersion === 1 || dirent.name.endsWith('-finalized') || text(meta.workflowRun) !== text(runId) || text(meta.articlePath).replace(/^\.\//, '') !== normalizedArticlePath) continue;
    if (text(workflowSha) && text(meta.workflowSha) !== text(workflowSha)) continue;
    const archivedPackPath = path.join(attemptDir, 'authoritative-evidence-pack.json');
    if (!fs.existsSync(archivedPackPath)) continue;
    const archivedPackRaw = fs.readFileSync(archivedPackPath, 'utf8');
    if (sha256(archivedPackRaw) !== sha256(currentPackRaw)) continue;
    matchingDirs.push({ name: dirent.name, path: attemptDir, metadata: meta, articleRaw: fs.existsSync(path.join(attemptDir, 'article.md')) ? fs.readFileSync(path.join(attemptDir, 'article.md'), 'utf8') : null });
  }
  if (!finalArticleRaw) {
    const blocked = matchingDirs.find(item => item.name.includes('claim-blocked') && item.articleRaw);
    finalArticleRaw = blocked?.articleRaw ?? null;
  }
  const eligibleSources = matchingDirs.filter(item => finalArticleRaw ? !item.name.includes('claim-blocked') : item.name.includes('claim-blocked'));
  const sourceDirs = eligibleSources.length ? [eligibleSources[0]] : [];
  if (typeof finalArticleRaw !== 'string' || articleTitle(finalArticleRaw) !== text(report.articleTitle)) {
    return { status: 'unknown-current-article-mismatch', bound: 0, conflicts: 0, skipped: 0, findings: ['final article bytes are unavailable or do not match claim report articleTitle'] };
  }
  if (sourceDirs.length === 0) return { status: 'no-run-matched-attempt', bound: 0, conflicts: 0, skipped: 0, findings: ['no archived attempt matches workflow run, article path, workflow SHA, and exact evidence-pack bytes'] };

  const slug = safeName(path.basename(normalizedArticlePath, '.md'));
  const result = { status: 'no-final-bundle-created', bound: 0, conflicts: 0, skipped: 0, findings: [] };
  for (const source of sourceDirs) {
    const targetName = safeName(source.name + '-finalized');
    const targetDir = path.join(attemptsDir, targetName);
    const hashes = {
      articleSha256: sha256(finalArticleRaw),
      evidencePackSha256: sha256(currentPackRaw),
      claimReportSha256: sha256(reportFile.raw)
    };
    if (fs.existsSync(targetDir)) {
      const meta = readJson(path.join(targetDir, 'metadata.json'))?.value;
      const articleBytes = fs.existsSync(path.join(targetDir, 'article.md')) ? fs.readFileSync(path.join(targetDir, 'article.md'), 'utf8') : null;
      const packBytes = fs.existsSync(path.join(targetDir, 'authoritative-evidence-pack.json')) ? fs.readFileSync(path.join(targetDir, 'authoritative-evidence-pack.json'), 'utf8') : null;
      const reportBytes = fs.existsSync(path.join(targetDir, 'claim-verification.json')) ? fs.readFileSync(path.join(targetDir, 'claim-verification.json'), 'utf8') : null;
      if (articleBytes === finalArticleRaw && packBytes === currentPackRaw && reportBytes === reportFile.raw
          && meta?.articleSha256 === hashes.articleSha256 && meta?.evidencePackSha256 === hashes.evidencePackSha256
          && meta?.claimReportSha256 === hashes.claimReportSha256) {
        result.bound++;
        result.findings.push({ directory: targetName, reason: 'identical final bundle already exists; idempotent no-op', ...hashes });
      } else {
        result.conflicts++;
        result.findings.push({ directory: targetName, reason: 'final bundle already exists with different bytes; preserved without overwrite' });
      }
      continue;
    }
    fs.mkdirSync(targetDir, { recursive: false });
    fs.writeFileSync(path.join(targetDir, 'article.md'), finalArticleRaw);
    fs.writeFileSync(path.join(targetDir, 'authoritative-evidence-pack.json'), currentPackRaw);
    fs.writeFileSync(path.join(targetDir, 'claim-verification.json'), reportFile.raw);
    const metadata = {
      ...source.metadata,
      status: report.pass === true ? 'claim-verification-pass-bound' : 'claim-verification-not-pass-bound',
      sourceAttemptDirectory: source.name,
      workflowRun: text(runId),
      workflowSha: text(workflowSha) || text(source.metadata.workflowSha) || 'unknown',
      articlePath: normalizedArticlePath,
      articleSha256: hashes.articleSha256,
      evidencePackSha256: hashes.evidencePackSha256,
      claimReportSha256: hashes.claimReportSha256,
      claimReportArticlePath: normalizedArticlePath,
      claimReportGeneratedAt: text(report.generatedAt) || null,
      claimVerificationPass: report.pass === true,
      claimVerificationStatus: text(report.status) || (report.pass === true ? 'pass' : 'not-pass'),
      hashesRecordedInWorkflow: true,
      lineageBindingVersion: 1,
      lineageBoundAt: boundAt
    };
    fs.writeFileSync(path.join(targetDir, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
    result.bound++;
    result.findings.push({ directory: targetName, reason: 'immutable final article, evidence pack and claim report bound to one workflow run', ...hashes });
  }
  if (result.conflicts === 0 && result.skipped === 0 && result.bound > 0) result.status = 'bound';
  else if (result.bound > 0) result.status = 'partially-bound';
  else if (result.conflicts > 0) result.status = 'conflict-preserved';
  else result.status = 'no-final-bundle-created';
  return result;
}

function main() {
  const root = path.resolve(process.env.BOAT_AUDIT_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const result = bindAttemptLineage({ root, runId: process.env.GITHUB_RUN_ID, workflowSha: process.env.GITHUB_SHA });
  process.stdout.write(JSON.stringify(result, null, 2) + String.fromCharCode(10));
  if (result.status.startsWith('invalid-')) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
