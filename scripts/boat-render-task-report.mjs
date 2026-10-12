#!/usr/bin/env node
/**
 * Deterministic human-readable renderer for a saved BOAT task record.
 * Pure formatting plus optional atomic Markdown output; no network or AI calls.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadTaskRecord, validateTaskRecord } from './boat-task-state.mjs';

const esc = value => String(value ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
const strong = value => '**' + esc(value) + '**';
const severityRank = { high: 0, medium: 1, low: 2 };
const statusLabel = status => String(status ?? 'unknown').replace(/_/g, ' ');

export function renderTaskReport(record) {
  const validation = validateTaskRecord(record);
  if (!validation.valid) throw new Error('Cannot render invalid BOAT task record: ' + validation.errors.join('; '));
  const findings = [...record.findings].sort((a, b) =>
    (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3) ||
    String(a.articleTitle ?? a.articleSlug ?? '').localeCompare(String(b.articleTitle ?? b.articleSlug ?? '')) ||
    String(a.category ?? '').localeCompare(String(b.category ?? '')) ||
    String(a.title ?? '').localeCompare(String(b.title ?? '')) ||
    String(a.findingId).localeCompare(String(b.findingId))
  );
  const counts = new Map();
  for (const item of findings) counts.set(item.category ?? 'uncategorized', (counts.get(item.category ?? 'uncategorized') ?? 0) + 1);
  const severityCounts = { high: 0, medium: 0, low: 0, other: 0 };
  for (const item of findings) severityCounts[Object.hasOwn(severityCounts, item.severity) ? item.severity : 'other']++;
  const lines = [
    '# BOAT Editorial Task Report',
    '',
    '- **Task ID:** ' + strong(record.taskId),
    '- **Task type:** ' + strong(record.taskType),
    '- **Status:** ' + strong(statusLabel(record.status)),
    '- **Pinned commit:** ' + strong(record.pinnedCommitSha),
    '- **Audit profile:** ' + strong(record.config.auditProfile ?? 'legacy/unspecified'),
    '- **Created:** ' + strong(record.createdAt),
    '- **Last updated:** ' + strong(record.updatedAt),
    '- **Revision:** ' + record.revision,
    '- **Progress:** ' + record.checkpoint.completedUnits.length + ' / ' + Number(record.config.totalArticles ?? record.checkpoint.completedUnits.length) + ' units',
    '- **Checkpoint:** ' + strong(record.checkpoint.cursor ?? 'not started'),
    '',
    '## Execution budgets',
    '',
    '| Resource | Used | Limit |',
    '|---|---:|---:|',
    '| AI calls | ' + record.budget.aiCalls + ' | ' + record.budget.limits.aiCalls + ' |',
    '| Web requests | ' + record.budget.webRequests + ' | ' + record.budget.limits.webRequests + ' |',
    '',
    '## Findings summary',
    '',
    '- **Total findings:** ' + findings.length,
    '- **Severity:** ' + severityCounts.high + ' high, ' + severityCounts.medium + ' medium, ' + severityCounts.low + ' low, ' + severityCounts.other + ' unspecified',
    '- **Automatic repair:** disabled',
    '- **Automatic publication decision:** disabled',
    '',
    '| Category | Count |',
    '|---|---:|',
    ...(counts.size ? [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([category, count]) => '| ' + esc(category) + ' | ' + count + ' |') : ['| none | 0 |']),
    '',
    '## Findings',
    ''
  ];
  if (!findings.length) lines.push('No findings were recorded. This means the configured checks emitted no findings; it is not a guarantee of factual correctness.', '');
  for (const finding of findings) {
    lines.push(
      '### ' + esc(finding.title ?? finding.findingId),
      '',
      '- **Severity:** ' + esc(finding.severity ?? 'unspecified'),
      '- **Category:** ' + strong(finding.category ?? 'uncategorized'),
      '- **Status:** ' + esc(statusLabel(finding.status)),
      '- **Article:** ' + strong(finding.articleSlug ?? 'unknown') + ' — ' + esc(finding.articleTitle ?? ''),
      '- **Finding ID:** ' + strong(finding.findingId),
      '- **Semantic support:** ' + esc(finding.semanticSupport ?? 'unknown'),
      '- **Human approval required:** ' + (finding.requiresApproval === true ? 'yes' : 'not specified'),
      '',
      esc(finding.description ?? 'No description recorded.'),
      ''
    );
    if (finding.claim) {
      const claim = finding.claim;
      lines.push('**Claim-history details**', '');
      if (claim.text) lines.push('- **Claim text:** ' + esc(claim.text));
      lines.push('- **Saved verifier status:** ' + esc(claim.savedVerifierStatus ?? 'unknown'));
      lines.push('- **Current article text match:** ' + esc(claim.currentArticleTextStatus ?? 'unknown'));
      lines.push('- **Source context:** ' + esc(claim.sourceContextStatus ?? 'unknown'));
      if (claim.currentArticleSha256) lines.push('- **Current article SHA-256:** ' + strong(claim.currentArticleSha256));
      if (claim.report?.reportSha256) lines.push('- **Archived report SHA-256:** ' + strong(claim.report.reportSha256));
      if (claim.report?.attemptId) lines.push('- **Archived attempt:** ' + strong(claim.report.attemptId));
      if (claim.report?.workflowRun) lines.push('- **Historical workflow run:** ' + strong(claim.report.workflowRun));
      if (claim.source?.title) lines.push('- **Saved source title:** ' + esc(claim.source.title));
      if (claim.source?.url) lines.push('- **Saved source URL:** ' + esc(claim.source.url));
      for (const passage of claim.passages ?? []) lines.push('- **Saved passage ' + esc(passage.id ?? 'unknown') + ':** ' + esc(passage.excerpt ?? 'No excerpt saved.'));
      lines.push('', 'These are archived metadata signals. They do not independently verify source reachability, freshness, passage identity, or semantic support.', '');
    }
  }
  lines.push('## Task errors and notes', '');
  if (!record.errors.length) lines.push('No task errors or notes recorded.', '');
  else for (const error of record.errors) lines.push('- **' + esc(error.code) + '** (' + strong(error.at) + '): ' + esc(error.message));
  lines.push('', '## Interpretation limits', '', '- Historical verifier PASS is not current fact verification.', '- Structural/provenance checks do not prove factual truth.', '- Unknown or missing evidence must not be interpreted as a pass.', '- This report is read-only and does not authorize edits, merges, or publication.', '');
  return lines.join('\n') + '\n';
}

export async function writeTaskReport(outputPath, record) {
  const absolute = path.resolve(outputPath);
  const markdown = renderTaskReport(record);
  await fs.promises.mkdir(path.dirname(absolute), { recursive: true });
  const temp = absolute + '.tmp-' + process.pid + '-' + Math.random().toString(16).slice(2);
  try {
    const handle = await fs.promises.open(temp, 'wx', 0o600);
    try { await handle.writeFile(markdown, 'utf8'); await handle.sync(); }
    finally { await handle.close(); }
    await fs.promises.rename(temp, absolute);
  } finally { await fs.promises.rm(temp, { force: true }).catch(() => {}); }
  return absolute;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help')) {
    process.stdout.write('Usage: node scripts/boat-render-task-report.mjs <task-state.json> [--output report.md]\n');
    return;
  }
  const statePath = argv[0];
  if (!statePath || statePath.startsWith('--')) throw new Error('Task state JSON path is required');
  let outputPath = null;
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] !== '--output' || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Expected --output <report.md>');
    if (outputPath) throw new Error('Duplicate --output option');
    outputPath = argv[++i];
  }
  const input = path.resolve(statePath);
  const record = await loadTaskRecord(input);
  if (!outputPath) { process.stdout.write(renderTaskReport(record)); return; }
  const output = path.resolve(outputPath);
  if (input === output) throw new Error('Report output path must not overwrite the task state JSON');
  await writeTaskReport(output, record);
  process.stdout.write(JSON.stringify({ taskId: record.taskId, status: record.status, reportPath: output }, null, 2) + '\n');
}
main().catch(error => {
  process.stderr.write('BOAT report render failed: ' + error.message + '\n');
  process.exitCode = 1;
});
