#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createFactualRepairProposal } from './boat-factual-repair-proposal.mjs';

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const string = value => typeof value === 'string' ? value.trim() : '';

export function adaptPipelineArtifacts({ articleRaw, claimReportRaw, evidencePackRaw = null, metadataRaw }) {
  const findings = [];
  const parse = (raw, label) => {
    if (typeof raw !== 'string') {
      findings.push({ code: 'BA-ARTIFACT-MISSING', severity: 'high', artifact: label });
      return null;
    }
    try {
      const value = JSON.parse(raw);
      if (!isObject(value)) throw new Error('Expected a JSON object');
      return value;
    } catch (error) {
      findings.push({ code: 'BA-ARTIFACT-INVALID-JSON', severity: 'high', artifact: label, message: error.message });
      return null;
    }
  };

  const claimArtifact = parse(claimReportRaw, 'claimReport');
  const evidencePack = evidencePackRaw === null ? null : parse(evidencePackRaw, 'evidencePack');
  const metadata = parse(metadataRaw, 'metadata');

  if (typeof articleRaw !== 'string') findings.push({ code: 'BA-ARTICLE-MISSING', severity: 'high', artifact: 'article' });
  if (claimArtifact && !Array.isArray(claimArtifact.claims)) {
    findings.push({ code: 'BA-CLAIMS-SHAPE-UNSUPPORTED', severity: 'high', artifact: 'claimReport', observedKeys: Object.keys(claimArtifact) });
  }
  if (evidencePack && !Array.isArray(evidencePack.sources)) {
    findings.push({ code: 'BA-EVIDENCE-PACK-SHAPE-UNSUPPORTED', severity: 'high', artifact: 'evidencePack', observedKeys: Object.keys(evidencePack) });
  }

  // Preserve claim fields verbatim. In particular, legacy bestPassageId values such as
  // S1-FF1 are not rewritten into the proposal engine's canonical S1-P1 identifiers.
  const claimReport = claimArtifact && Array.isArray(claimArtifact.claims)
    ? { ...claimArtifact, claims: claimArtifact.claims.map(claim => ({ ...claim })) }
    : claimArtifact;

  // Only recorded hashes are authoritative. The adapter deliberately does not manufacture
  // metadata hashes from the supplied bytes, because that would not prove same-run lineage.
  const normalizedMetadata = metadata ? {
    ...metadata,
    workflowRun: string(metadata.workflowRun),
    articleSha256: string(metadata.articleSha256),
    claimReportSha256: string(metadata.claimReportSha256),
    evidencePackSha256: string(metadata.evidencePackSha256)
  } : metadata;

  if (metadata && (!string(metadata.claimReportSha256) || !string(metadata.evidencePackSha256))) {
    findings.push({
      code: 'BA-RECORDED-HASHES-MISSING',
      severity: 'high',
      message: 'Metadata does not record both claim-report and evidence-pack hashes; exact same-run lineage cannot be established.'
    });
  }
  if (!evidencePackRaw) {
    findings.push({
      code: 'BA-EVIDENCE-PACK-MISSING',
      severity: 'high',
      message: 'No saved evidence-pack artifact was supplied; article brief/source lists are not silently substituted for the canonical evidence pack.'
    });
  }

  return {
    schemaVersion: '1.0',
    adapter: 'BOAT Pipeline Artifact Adapter',
    mode: 'read-only',
    findings,
    inputs: {
      articleRaw,
      claimReportRaw,
      evidencePackRaw,
      metadataRaw,
      claimReport,
      evidencePack,
      metadata: normalizedMetadata
    }
  };
}

export function createProposalFromPipelineArtifacts({ articleRaw, claimReportRaw, evidencePackRaw = null, metadataRaw, proposal, generatedAt } = {}) {
  const adapted = adaptPipelineArtifacts({ articleRaw, claimReportRaw, evidencePackRaw, metadataRaw });
  const proposalResult = createFactualRepairProposal({
    articleRaw,
    claimReport: adapted.inputs.claimReport,
    claimReportRaw,
    evidencePack: adapted.inputs.evidencePack,
    evidencePackRaw,
    metadata: adapted.inputs.metadata,
    proposal,
    generatedAt
  });
  return {
    ...proposalResult,
    adapter: { name: adapted.adapter, schemaVersion: adapted.schemaVersion, findings: adapted.findings },
    // Adapter warnings are always retained in the output; they do not override the
    // proposal engine's stricter integrity status.
    status: adapted.findings.some(item => item.severity === 'high') ? 'unknown' : proposalResult.status
  };
}

function readOptional(file) {
  return file && file !== '-' ? fs.readFileSync(file, 'utf8') : null;
}
function main(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (!key?.startsWith('--') || !value) throw new Error('Expected --article FILE --claim-report FILE --metadata FILE --output FILE and optional --evidence-pack FILE; use - for missing evidence pack.');
    options[key.slice(2)] = value;
  }
  for (const required of ['article', 'claim-report', 'metadata', 'output']) {
    if (!options[required]) throw new Error('Missing required --' + required + ' argument.');
  }
  const inputPaths = [options.article, options['claim-report'], options['evidence-pack'], options.metadata].filter(Boolean).map(value => path.resolve(value));
  const outputPath = path.resolve(options.output);
  if (inputPaths.includes(outputPath)) throw new Error('Output must not overwrite an input artifact.');
  if (fs.existsSync(outputPath)) throw new Error('Output already exists; refusing to overwrite.');
  const result = createProposalFromPipelineArtifacts({
    articleRaw: readOptional(options.article),
    claimReportRaw: readOptional(options['claim-report']),
    evidencePackRaw: readOptional(options['evidence-pack']),
    metadataRaw: readOptional(options.metadata),
    proposal: {
      claimIndex: Number(options['claim-index']),
      replacementText: options['replacement-text'] || '',
      rationale: options.rationale || '',
      sourceId: options['source-id'] || '',
      passageId: options['passage-id'] || ''
    }
  });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  process.stdout.write(JSON.stringify({ status: result.status, output: outputPath, findingCount: result.findings.length, adapterFindingCount: result.adapter.findings.length }) + '\n');
  if (result.status !== 'review_required') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(process.argv.slice(2)); }
  catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 2; }
}
