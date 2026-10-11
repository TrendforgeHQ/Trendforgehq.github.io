#!/usr/bin/env node
/**
 * BOAT Article Doctor — offline, read-only claim-report analyzer.
 * This parses existing verifier outputs; it does not independently fact-check claims.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const readText = file => fs.readFileSync(file, 'utf8');
const parseJson = (text, file) => {
  try { return JSON.parse(text); }
  catch (error) { throw new Error(`Invalid JSON in ${file}: ${error.message}`); }
};
const titleFromMarkdown = text => {
  const frontmatter = text.match(/^---\s*\n([\s\S]*?)\n---/);
  const match = frontmatter?.[1]?.match(/^title:\s*(.*?)\s*$/m);
  if (!match) return '';
  return match[1].replace(/^["']|["']$/g, '').trim();
};
function bodyFromMarkdown(text) {
  return String(text).replace(/^---\s*\n[\s\S]*?\n---\s*/,'').replace(/^\s{0,3}#{1,6}\s+Sources\s*\n[\s\S]*$/im,'');
}


function makeFinding({ id, category, severity, title, description, claim, reportPath, index, workflowRun, recommendation, sourceUrl = null, sourceTitle = null, sourceId = null, sourceRole = null, passageIds = [], sourceExcerpt = null }) {
  return {
    findingId: id, category, severity, status: 'confirmed', title, description,
    affectedText: claim ?? null, confidence: 100,
    evidence: [{ artifactPath: reportPath, jsonPointer: index == null ? null : `/claims/${index}`, workflowRun: workflowRun ?? null, detail: description, sourceUrl, sourceTitle, sourceId, sourceRole, passageIds, sourceExcerpt }],
    recommendation, requiresApproval: true,
    validationPlan: ['Review the exact archived article and evidence passages.', 'If a repair is proposed, rerun the existing claim verifier before any publication decision.']
  };
}


function sourceEvidenceFields(claim = {}) {
  const passageIds = Array.isArray(claim.matchedPassages) ? claim.matchedPassages : String(claim.bestPassageId ?? '').split(',');
  const excerpt = String(claim.evidence ?? claim.bestPassage ?? '').trim();
  const valueOrNull = value => typeof value === 'string' && value.trim() ? value.trim() : null;
  return {
    sourceUrl: valueOrNull(claim.bestUrl),
    sourceTitle: valueOrNull(claim.bestSource),
    sourceId: valueOrNull(claim.sourceId),
    sourceRole: valueOrNull(claim.sourceRole),
    passageIds: passageIds.map(String).map(value => value.trim()).filter(Boolean),
    sourceExcerpt: excerpt ? excerpt.slice(0, 500) : null
  };
}

export function analyzeArticle({ articleText, articlePath, report, reportPath, metadata = null, metadataPath = null, expectedWorkflowRun = null, generatedAt = '1970-01-01T00:00:00.000Z' }) {
  const actualTitle = titleFromMarkdown(articleText);
  const reportTitle = String(report?.articleTitle ?? '');
  const workflowRun = metadata?.workflowRun == null ? null : String(metadata.workflowRun);
  const workflowSha = metadata?.workflowSha == null ? null : String(metadata.workflowSha);
  const findings = [];
  const articleBody = bodyFromMarkdown(articleText);
  const bodyLines = articleBody.split('\n');
  for (let i = 0; i < bodyLines.length; i++) {
    if (/^[ \t]{0,3}#{1,6}[ \t]*$/.test(bodyLines[i])) {
      findings.push(makeFinding({
        id: 'AD-EMPTY-HEADING-' + (i + 1), category: 'empty_heading', severity: 'medium',
        title: 'Empty Markdown heading',
        description: 'An empty Markdown heading was found in the article body at body line ' + (i + 1) + '.',
        claim: bodyLines[i].trim(), reportPath: articlePath, index: null, workflowRun,
        recommendation: 'Add a meaningful heading or remove the empty heading; re-read the surrounding section after editing.'
      }));
    }
  }
  const prose = articleBody.replace(/^[ \t]{0,3}#{1,6}[ \t]+.*$/gm, '').replace(/^[ \t]{0,3}#{1,6}[ \t]*$/gm, '').replace(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+/gm, '').replace(/[ \t\r\n]+/g, ' ');
  const candidates = prose.split(/(?<=[.!?])\s+(?=[A-Z0-9"“$])/).map(s => s.trim()).filter(s => s.length >= 50 && s.split(/\s+/).length >= 8);
  const repeated = new Map();
  for (const sentence of candidates) {
    const key = sentence.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key) continue;
    if (!repeated.has(key)) repeated.set(key, []);
    repeated.get(key).push(sentence);
  }
  for (const [key, occurrences] of repeated) {
    if (occurrences.length < 2) continue;
    findings.push(makeFinding({
      id: 'AD-REPEATED-SENTENCE-' + hash(key).slice(0, 8), category: 'repeated_sentence', severity: 'medium',
      title: 'Repeated sentence in article body',
      description: 'The same normalized sentence appears ' + occurrences.length + ' times in the article body.',
      claim: occurrences[0], reportPath: articlePath, index: null, workflowRun,
      recommendation: 'Review the repeated sentence and retain only the intended occurrence without removing unique evidence or context.'
    }));
  }
  const limitations = [
    'This report maps saved verifier signals and deterministic Markdown structure patterns; it does not independently re-check source truth.',
    'A saved claim-verification PASS does not prove every factual statement is universally correct.',
    'Structural checks use exact normalized sentence matching and simple Markdown patterns; paraphrased repetition and other editorial issues may be missed.',
    'No network requests, provider calls, article edits, workflow dispatch, or publication actions are performed.'
  ];

  if (!actualTitle || !reportTitle || actualTitle.toLowerCase() !== reportTitle.toLowerCase()) {
    findings.push(makeFinding({
      id: 'AD-ARTIFACT-TITLE-001', category: 'artifact_integrity', severity: 'high',
      title: 'Article and claim report titles do not match',
      description: `Markdown title "${actualTitle || '(missing)'}" does not match claim report title "${reportTitle || '(missing)'}".`,
      reportPath, workflowRun, recommendation: 'Confirm that the article and claim report belong to the same attempt before interpreting findings.'
    }));
  }
  if (expectedWorkflowRun != null && String(expectedWorkflowRun) !== String(workflowRun)) {
    findings.push(makeFinding({
      id: 'AD-ARTIFACT-RUN-001', category: 'artifact_integrity', severity: 'high',
      title: 'Workflow run does not match requested run',
      description: `Expected workflow run ${expectedWorkflowRun}; metadata contains ${workflowRun ?? '(missing)'}.`,
      reportPath, workflowRun, recommendation: 'Load the article, report and metadata from the same archived workflow attempt.'
    }));
  }
  if (!Array.isArray(report?.claims)) {
    findings.push(makeFinding({
      id: 'AD-ARTIFACT-CLAIMS-001', category: 'artifact_integrity', severity: 'high',
      title: 'Claim report has no claims array', description: 'The saved claim report is missing its claims array.',
      reportPath, workflowRun, recommendation: 'Do not treat this artifact as a valid claim-verification report.'
    }));
  } else {
    for (let i = 0; i < report.claims.length; i++) {
      const claim = report.claims[i] ?? {};
      const text = String(claim.claim ?? '');
      const index = Number.isInteger(claim.index) ? claim.index : i + 1;
      const jsonIndex = i;
      const sourceIndex = jsonIndex;
      const sourceFields = sourceEvidenceFields(claim);
      if (claim.status === 'unsupported' || String(claim.classification ?? '').startsWith('unsupported')) {
        findings.push(makeFinding({
          id: `AD-UNSUPPORTED-${index}`, category: 'unsupported_claim', severity: 'high',
          title: 'Claim verifier marked a claim unsupported',
          description: `Saved verifier status is "${claim.status ?? 'missing'}"; confidence ${claim.confidence ?? 'unknown'}.`,
          claim: text, reportPath, index: sourceIndex, workflowRun, ...sourceFields,
          recommendation: 'Inspect the cited passage and remove, qualify, or repair the claim only after evidence review.'
        }));
      }
      if (claim.contradicted === true || claim.status === 'contradicted') {
        findings.push(makeFinding({
          id: `AD-CONTRADICTED-${index}`, category: 'contradicted_claim', severity: 'critical',
          title: 'Claim verifier detected a contradiction',
          description: 'The saved verifier report marks this claim as contradicted.',
          claim: text, reportPath, index: sourceIndex, workflowRun, ...sourceFields,
          recommendation: 'Quarantine this claim for editorial review; any repair must be re-verified.'
        }));
      }
      if (claim.numericMismatch === true) {
        findings.push(makeFinding({
          id: `AD-NUMERIC-${index}`, category: 'numeric_mismatch', severity: 'critical',
          title: 'Claim verifier detected a numeric mismatch',
          description: 'The saved verifier report marks a quantitative mismatch.',
          claim: text, reportPath, index: sourceIndex, workflowRun, ...sourceFields,
          recommendation: 'Compare every number and unit with the cited evidence; do not infer or silently normalize values.'
        }));
      }
      const attribution = claim.attributionUncertainty;
      if (attribution?.blocked === true || attribution?.certaintyEscalation === true || attribution?.attributionDropped === true) {
        findings.push(makeFinding({
          id: `AD-ATTRIBUTION-${index}`, category: 'attribution', severity: attribution.blocked ? 'high' : 'medium',
          title: 'Claim has an attribution or certainty warning',
          description: `Attribution diagnostics: blocked=${Boolean(attribution.blocked)}, certaintyEscalation=${Boolean(attribution.certaintyEscalation)}, attributionDropped=${Boolean(attribution.attributionDropped)}.`,
          claim: text, reportPath, index: sourceIndex, workflowRun, ...sourceFields,
          recommendation: 'Preserve the source attribution and uncertainty level; check the exact source wording before editing.'
        }));
      }
      if (Array.isArray(claim.scopeWarnings) && claim.scopeWarnings.length) {
        findings.push(makeFinding({
          id: `AD-SCOPE-${index}`, category: 'temporal_context', severity: 'medium',
          title: 'Claim has a scope or temporal warning',
          description: `Verifier scope warnings: ${claim.scopeWarnings.map(String).join('; ')}.`,
          claim: text, reportPath, index: sourceIndex, workflowRun, ...sourceFields,
          recommendation: 'Check the claim scope and time period against the source; avoid universal wording unless the evidence supports it.'
        }));
      }
    }
  }

  const highSeverityCount = findings.filter(f => ['critical', 'high'].includes(f.severity)).length;
  const blocked = report?.pass === false || findings.some(f => ['critical', 'high'].includes(f.severity));
  const status = findings.some(f => f.category === 'artifact_integrity') ? 'unknown' : blocked ? 'blocked' : findings.length ? 'attention' : report?.pass === true ? 'clear' : 'unknown';
  const inputs = [{ artifactPath: articlePath, text: articleText }, { artifactPath: reportPath, text: JSON.stringify(report) }];
  if (metadataPath && metadata) inputs.push({ artifactPath: metadataPath, text: JSON.stringify(metadata) });
  return {
    schemaVersion: '1.0',
    reportId: `boat-article-doctor-${hash(inputs.map(x => x.text).join('\n')).slice(0, 16)}`,
    generatedAt, mode: 'read-only',
    subject: { type: 'article', articlePath, title: actualTitle, revision: 'unknown-not-provided', workflowRun },
    summary: {
      status, findingCount: findings.length, highSeverityCount,
      message: findings.length ? `Found ${findings.length} diagnostic finding(s) from saved artifacts.` : status === 'clear' ? 'No mapped warning signals were found in the supplied verifier report.' : 'The available artifacts are insufficient to determine a clean status.'
    },
    findings,
    provenance: inputs.map(input => ({
      artifactPath: input.artifactPath, sha256: hash(input.text),
      workflowRun, workflowSha
    })),
    checks: [
      { checkId: 'input-title-match', status: actualTitle && reportTitle && actualTitle.toLowerCase() === reportTitle.toLowerCase() ? 'pass' : 'fail', detail: 'Compare article frontmatter title with claim report title.' },
      { checkId: 'claim-report-pass', status: report?.pass === true ? 'pass' : report?.pass === false ? 'fail' : 'unknown', detail: 'Copies the existing verifier result; does not independently re-verify claims.' },
      { checkId: 'independent-source-recheck', status: 'not_run', detail: 'Offline mode intentionally does not fetch or re-check external sources.' }
    ],
    limitations
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) throw new Error(`Unexpected argument: ${argv[i]}`);
    const key = argv[i].slice(2);
    if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`Missing value for --${key}`);
    args[key] = argv[++i];
  }
  for (const required of ['article', 'report']) if (!args[required]) throw new Error(`Required argument --${required}`);
  return args;
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const articleText = readText(args.article);
    const reportText = readText(args.report);
    const report = parseJson(reportText, args.report);
    const metadataText = args.metadata ? readText(args.metadata) : null;
    const metadata = metadataText ? parseJson(metadataText, args.metadata) : null;
    const output = analyzeArticle({
      articleText, articlePath: args.article, report, reportPath: args.report,
      metadata, metadataPath: args.metadata ?? null, expectedWorkflowRun: args['expected-run'] ?? null,
      generatedAt: new Date().toISOString()
    });
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  } catch (error) {
    process.stderr.write(`BOAT Article Doctor error: ${error.message}\n`);
    process.exitCode = 2;
  }
}
