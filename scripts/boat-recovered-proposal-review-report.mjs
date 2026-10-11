#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { auditRecoveredRunArtifacts } from './boat-run-artifact-recovery.mjs';
import { buildRecoveredProposalInputs } from './boat-recovered-proposal-input.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const samples = [
  {
    runId: '38085367295', artifactId: '11682276860', artifactName: 'trendforge-article-attempt-492',
    generatedDir: 'data/article-attempts/20261010-205544-anthropic-ai-model-submits-false-murder-tip-to-philadelphia-police',
    blockedDir: 'data/article-attempts/20261010-205638-anthropic-ai-model-submits-false-murder-tip-to-philadelphia-police-claim-blocked'
  },
  {
    runId: '37996683799', artifactId: '11647766077', artifactName: 'trendforge-article-attempt-488',
    generatedDir: 'data/article-attempts/20261009-220306-ai-generated-code-blooms-but-software-shipments-stay-flat',
    blockedDir: 'data/article-attempts/20261009-220410-ai-generated-code-blooms-but-software-shipments-stay-flat-claim-blocked'
  },
  {
    runId: '37696062759', artifactId: '11515936671', artifactName: 'trendforge-article-attempt-478',
    generatedDir: 'data/article-attempts/20261007-223019-10x-research-bitcoin-bottom-forecast-missed-what-the-numbers-reveal',
    blockedDir: 'data/article-attempts/20261007-223044-10x-research-bitcoin-bottom-forecast-missed-what-the-numbers-reveal-claim-blocked'
  }
];

function read(relative) { return fs.readFileSync(path.join(root, relative), 'utf8'); }

function countStatuses(claims) {
  return {
    totalClaims: claims.length,
    eligible: claims.filter(claim => claim.status === 'ready_for_human_proposal').length,
    blocked: claims.filter(claim => claim.status === 'blocked').length,
    unknown: claims.filter(claim => claim.status === 'unknown').length
  };
}

function buildSample(sample) {
  const input = {
    articleRaw: read(path.join(sample.blockedDir, 'article.md')),
    claimReportRaw: read(path.join(sample.blockedDir, 'claim-verification.json')),
    articleBriefRaw: read(path.join(sample.blockedDir, 'article-brief.json')),
    evidencePackRaw: read(path.join(sample.generatedDir, 'authoritative-evidence-pack.json')),
    blockedMetadataRaw: read(path.join(sample.blockedDir, 'metadata.json')),
    generatedMetadataRaw: read(path.join(sample.generatedDir, 'metadata.json')),
    artifactRunId: sample.runId,
    artifactId: sample.artifactId,
    artifactName: sample.artifactName
  };
  const audit = auditRecoveredRunArtifacts(input);
  const result = buildRecoveredProposalInputs({
    recoveryAudit: audit,
    articleRaw: input.articleRaw,
    claimReportRaw: input.claimReportRaw,
    articleBriefRaw: input.articleBriefRaw,
    evidencePackRaw: input.evidencePackRaw
  });
  const claims = result.claims.map(claim => ({
    claimIndex: claim.claimIndex,
    status: claim.status,
    sourceId: claim.source?.sourceId ?? null,
    passageId: claim.passage?.canonicalPassageId ?? null,
    reasonCodes: claim.findings.map(item => item.code)
  }));
  const computed = countStatuses(claims);
  if (computed.totalClaims !== result.counts.totalClaims ||
      computed.eligible !== result.counts.eligible ||
      computed.blocked !== result.counts.blocked ||
      computed.unknown !== result.counts.unknown) {
    throw new Error('Adapter count mismatch for run ' + sample.runId +
      ': adapter=' + JSON.stringify(result.counts) + ', claim-derived=' + JSON.stringify(computed));
  }
  return {
    runId: sample.runId,
    artifactId: sample.artifactId,
    artifactName: sample.artifactName,
    recoveryStatus: audit.status,
    bundleStatus: result.status,
    totalClaims: computed.totalClaims,
    eligible: computed.eligible,
    blocked: computed.blocked,
    unknown: computed.unknown,
    countsReconciled: true,
    hashProvenance: result.hashes.provenance,
    recordedAtGeneration: result.hashes.recordedAtGeneration,
    claims,
    findings: result.findings.map(item => ({ code: item.code, severity: item.severity })),
    approvalRequired: result.approvalRequired,
    automaticApplication: result.automaticApplication,
    semanticSupport: result.semanticSupport
  };
}

export function buildReviewReport() {
  const runs = samples.map(buildSample);
  const allClaims = runs.flatMap(run => run.claims);
  const computed = countStatuses(allClaims);
  const runTotals = runs.reduce((sum, run) => ({
    totalClaims: sum.totalClaims + run.totalClaims,
    eligible: sum.eligible + run.eligible,
    blocked: sum.blocked + run.blocked,
    unknown: sum.unknown + run.unknown
  }), { totalClaims: 0, eligible: 0, blocked: 0, unknown: 0 });
  if (computed.totalClaims !== runTotals.totalClaims ||
      computed.eligible !== runTotals.eligible ||
      computed.blocked !== runTotals.blocked ||
      computed.unknown !== runTotals.unknown) {
    throw new Error('Aggregate report counts do not reconcile with per-run claim statuses.');
  }
  return {
    schemaVersion: '1.0',
    engine: 'BOAT Recovered Proposal Eligibility Report',
    mode: 'offline-read-only',
    generatedAt: new Date().toISOString(),
    summary: {
      runs: runs.length,
      claims: computed.totalClaims,
      eligible: computed.eligible,
      blocked: computed.blocked,
      unknown: computed.unknown,
      countsReconciled: true,
      recoveryHashesRecordedAtGeneration: false,
      semanticSupport: 'not_verified',
      automaticApplication: false
    },
    runs,
    limitations: [
      'This report is computed from checked-in recovered article/report/brief/pack bytes; it does not query GitHub.',
      'Hashes were computed during recovery, not recorded at original generation time.',
      'Eligible means the claim has exact article text, matching source lineage, and a unique exact-text passage mapping. It does not mean the claim is factually supported.',
      'All eligible claims still require a separate human-authored proposal and the existing verification/editorial gates.',
      'The report is printed to stdout only; it does not write or modify article artifacts.'
    ]
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    process.stdout.write(JSON.stringify(buildReviewReport(), null, 2) + '\n');
  } catch (error) {
    process.stderr.write('BOAT eligibility report failed closed: ' + error.message + '\n');
    process.exitCode = 1;
  }
}
