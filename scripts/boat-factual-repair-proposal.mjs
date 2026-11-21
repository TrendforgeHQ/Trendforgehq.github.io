#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const text = value => typeof value === 'string' ? value.trim() : '';
const finding = (code, severity, message, details = {}) => ({ code, severity, message, details });

export function createFactualRepairProposal({
  articleRaw, articlePath = null,
  claimReport, claimReportRaw, claimReportPath = null,
  evidencePack, evidencePackRaw, evidencePackPath = null,
  metadata, metadataPath = null,
  proposal, generatedAt = '2000-01-01T00:00:00.000Z'
} = {}) {
  const findings = [];
  const integrity = [];
  const add = (code, severity, message, details = {}) => findings.push(finding(code, severity, message, details));
  const addIntegrity = (code, message, details = {}) => {
    const item = finding(code, 'high', message, details);
    findings.push(item);
    integrity.push(item);
  };

  if (typeof articleRaw !== 'string') addIntegrity('FR-ARTICLE-MISSING', 'Exact original article text is required.');
  if (!claimReport || !Array.isArray(claimReport.claims)) addIntegrity('FR-CLAIMS-MISSING', 'Claim report is missing or has no claims array.');
  if (!evidencePack || (!Array.isArray(evidencePack.sources) && !Array.isArray(evidencePack.candidates))) addIntegrity('FR-PACK-MISSING', 'Evidence pack is missing or has neither a sources array nor a candidate envelope.');
  if (!metadata || typeof metadata !== 'object') addIntegrity('FR-METADATA-MISSING', 'Run metadata is required.');
  if (!proposal || typeof proposal !== 'object') addIntegrity('FR-PROPOSAL-MISSING', 'A proposed replacement object is required.');

  let claim = null;
  let source = null;
  let candidateSources = null;
  let passageText = null;
  if (!integrity.length) {
    const expected = {
      articleSha256: typeof articleRaw === 'string' ? sha256(articleRaw) : '',
      claimReportSha256: typeof claimReportRaw === 'string' ? sha256(claimReportRaw) : '',
      evidencePackSha256: typeof evidencePackRaw === 'string' ? sha256(evidencePackRaw) : ''
    };
    for (const [key, actual] of Object.entries(expected)) {
      if (!actual || !text(metadata[key])) addIntegrity('FR-HASH-MISSING', 'Exact ' + key + ' is required in run metadata.', { key });
      else if (actual !== text(metadata[key])) addIntegrity('FR-HASH-MISMATCH', key + ' does not match the supplied raw artifact.', { key });
    }
    const runId = text(metadata.workflowRun);
    if (!runId) addIntegrity('FR-RUN-MISSING', 'Workflow run ID is missing from metadata.');
    const reportRun = text(claimReport.workflowRun ?? claimReport.metadata?.workflowRun);
    const packRun = text(evidencePack.workflowRun ?? evidencePack.metadata?.workflowRun);
    if (reportRun && runId && reportRun !== runId) addIntegrity('FR-REPORT-RUN-MISMATCH', 'Claim report workflow run differs from metadata.');
    if (packRun && runId && packRun !== runId) addIntegrity('FR-PACK-RUN-MISMATCH', 'Evidence pack workflow run differs from metadata.');
    if (reportRun && packRun && reportRun !== packRun) addIntegrity('FR-ARTIFACT-RUN-MISMATCH', 'Claim report and evidence pack identify different workflow runs.');

    if (Array.isArray(evidencePack.candidates)) {
      const candidateTitle = text(proposal.candidateTitle);
      const candidateLink = text(proposal.candidateLink);
      if (!candidateTitle || !candidateLink) {
        add('FR-CANDIDATE-IDENTITY-MISSING', 'high', 'Candidate-envelope packs require exact candidateTitle and candidateLink in the proposal.');
      } else {
        const candidateMatches = evidencePack.candidates.filter(item =>
          text(item?.candidate?.title) === candidateTitle &&
          text(item?.candidate?.link) === candidateLink
        );
        if (candidateMatches.length !== 1) {
          add('FR-CANDIDATE-IDENTITY-NOT-UNIQUE', 'high', 'Candidate title/link must identify exactly one evidence-pack candidate.', {
            candidateTitle, candidateLink, matchCount: candidateMatches.length
          });
        } else if (candidateMatches[0].status !== 'authoritative' || !Array.isArray(candidateMatches[0].sources)) {
          add('FR-CANDIDATE-NOT-AUTHORITATIVE', 'high', 'Selected evidence-pack candidate is not authoritative or has no sources.');
        } else {
          candidateSources = candidateMatches[0].sources;
        }
      }
    } else if (Array.isArray(evidencePack.sources)) {
      candidateSources = evidencePack.sources;
    }

    const claimIndex = Number(proposal.claimIndex);
    claim = claimReport.claims.find(item => Number(item?.index) === claimIndex) || null;
    const replacementText = text(proposal.replacementText);
    const rationale = text(proposal.rationale);
    const requestedSourceId = text(proposal.sourceId);
    const passageId = text(proposal.passageId);
    if (!Number.isInteger(claimIndex) || !claim) add('FR-CLAIM-NOT-FOUND', 'high', 'Target claim index is not present in the saved claim report.', { claimIndex: proposal.claimIndex });
    if (!replacementText) add('FR-REPLACEMENT-MISSING', 'high', 'A non-empty replacementText is required.');
    if (!rationale) add('FR-RATIONALE-MISSING', 'medium', 'A concise repair rationale is required.');
    if (claim && replacementText && text(claim.claim) === replacementText) add('FR-NO-CHANGE', 'medium', 'Replacement text is identical to the saved claim.');
    if (claim && !text(claim.claim)) add('FR-ORIGINAL-CLAIM-MISSING', 'high', 'Saved claim has no original claim text.');
    if (claim && requestedSourceId && text(claim.sourceId) !== requestedSourceId) {
      add('FR-SOURCE-CLAIM-MISMATCH', 'high', 'Proposal sourceId does not match the target claim sourceId.', { claimSourceId: text(claim.sourceId), requestedSourceId });
    }
    if (!requestedSourceId) add('FR-SOURCE-ID-MISSING', 'high', 'Proposal must name the sourceId used for the correction.');
    if (!/^S\d+-P\d+$/.test(passageId)) {
      add('FR-PASSAGE-ID-INVALID', 'high', 'Proposal passageId must use canonical Sx-Pn format.', { passageId });
    } else if (requestedSourceId && !passageId.startsWith(requestedSourceId + '-')) {
      add('FR-PASSAGE-SOURCE-MISMATCH', 'high', 'Passage ID prefix does not match proposal sourceId.', { passageId, requestedSourceId });
    }
    source = (Array.isArray(candidateSources) ? candidateSources : []).find(item => text(item?.id) === requestedSourceId) || null;
    if (requestedSourceId && !source) add('FR-SOURCE-NOT-IN-PACK', 'high', 'Proposal sourceId is absent from the supplied evidence pack.', { requestedSourceId });
    if (source && /^S\d+-P\d+$/.test(passageId) && passageId.startsWith(requestedSourceId + '-')) {
      const passageNumber = Number(passageId.split('-P')[1]);
      if (Array.isArray(source.passages) && passageNumber >= 1 && passageNumber <= source.passages.length) {
        passageText = typeof source.passages[passageNumber - 1] === 'string' ? source.passages[passageNumber - 1] : null;
      }
      const relevant = evidencePack.evidenceBrief?.relevantPassages;
      if (passageText === null && Array.isArray(relevant)) {
        const match = relevant.find(item => text(item?.sourceId) === requestedSourceId && text(item?.passageId ?? item?.id) === passageId);
        if (match) passageText = text(match.text ?? match.passage ?? match.excerpt) || null;
      }
      if (!passageText) add('FR-PASSAGE-NOT-IN-PACK', 'high', 'The requested passage ID cannot be resolved to text in the evidence pack.', { requestedSourceId, passageId });
    }
    if (claim && passageId && Array.isArray(claim.matchedPassages) && !claim.matchedPassages.includes(passageId) && text(claim.bestPassageId) !== passageId) {
      add('FR-PASSAGE-NOT-LINKED-TO-CLAIM', 'medium', 'The passage exists in the pack but is not recorded as a matched/best passage for this claim.', { passageId });
    }
    if (claim && source) {
      const claimUrl = text(claim.bestUrl ?? claim.sourceUrl);
      const packUrl = text(source.url ?? source.finalUrl);
      if (claimUrl && packUrl && claimUrl !== packUrl) add('FR-SOURCE-URL-MISMATCH', 'high', 'Claim URL differs from the selected evidence-pack source URL.', { claimUrl, packUrl });
    }
    if (claim && text(claim.claim) && typeof articleRaw === 'string' && !articleRaw.includes(text(claim.claim))) {
      add('FR-CLAIM-NOT-FOUND-IN-ARTICLE', 'high', 'Exact saved claim text was not found in the original article; target matching must be reviewed.', { claimIndex });
    }
  }

  const status = integrity.length ? 'unknown' : findings.some(item => item.severity === 'high') ? 'blocked' : 'review_required';
  const selectedSource = source || (Array.isArray(candidateSources) ? candidateSources.find(item => text(item?.id) === text(proposal?.sourceId)) : null);
  const selectedPassageId = text(proposal?.passageId);
  if (selectedSource && passageText === null && /^S\d+-P\d+$/.test(selectedPassageId) && selectedPassageId.startsWith(text(selectedSource.id) + '-')) {
    const n = Number(selectedPassageId.split('-P')[1]);
    if (Array.isArray(selectedSource.passages) && n >= 1 && n <= selectedSource.passages.length) passageText = selectedSource.passages[n - 1];
    if (passageText == null && Array.isArray(evidencePack?.evidenceBrief?.relevantPassages)) {
      const match = evidencePack.evidenceBrief.relevantPassages.find(item => text(item?.sourceId) === text(selectedSource.id) && text(item?.passageId ?? item?.id) === selectedPassageId);
      if (match) passageText = text(match.text ?? match.passage ?? match.excerpt) || null;
    }
  }
  return {
    schemaVersion: '1.0',
    engine: 'BOAT Factual Repair Proposal',
    mode: 'offline-proposal-only',
    status,
    generatedAt,
    approvalRequired: true,
    automaticApplication: false,
    semanticSupport: 'not_verified',
    claim: claim ? { index: Number(claim.index), originalText: text(claim.claim), sourceId: text(claim.sourceId) || null } : null,
    proposal: {
      replacementText: text(proposal?.replacementText) || null,
      candidateTitle: text(proposal?.candidateTitle) || null,
      candidateLink: text(proposal?.candidateLink) || null,
      rationale: text(proposal?.rationale) || null,
      sourceId: text(proposal?.sourceId) || null,
      passageId: selectedPassageId || null,
      sourceUrl: selectedSource ? text(selectedSource.url ?? selectedSource.finalUrl) || null : null,
      sourceTitle: selectedSource ? text(selectedSource.title) || null : null,
      sourceRole: selectedSource ? text(selectedSource.sourceRole ?? selectedSource.role) || null : null,
      passageText: typeof passageText === 'string' ? passageText : null
    },
    artifacts: {
      articlePath, claimReportPath, evidencePackPath, metadataPath,
      articleSha256: typeof articleRaw === 'string' ? sha256(articleRaw) : null,
      claimReportSha256: typeof claimReportRaw === 'string' ? sha256(claimReportRaw) : null,
      evidencePackSha256: typeof evidencePackRaw === 'string' ? sha256(evidencePackRaw) : null,
      workflowRun: text(metadata?.workflowRun) || null
    },
    findings,
    limitations: [
      'This output is a proposal only; the original article is never edited.',
      'A source/passage lineage match does not prove the passage semantically supports the proposed replacement.',
      'Human review and the existing claim-verification/editorial gates are mandatory before any change can be accepted.',
      'No source is fetched and no fact is generated by this module.'
    ],
    reviewChecklist: [
      'Reviewer confirms the selected source passage semantically supports every factual part of the proposed replacement.',
      'Reviewer compares the original claim and proposed replacement; no unsupported detail was added or important qualification removed.',
      'Reviewer verifies names, dates, quantities, units, scope, attribution, and uncertainty against the cited passage.',
      'Reviewer checks source independence, recency, and whether the source role is appropriate for the claim.',
      'Run the existing claim verifier and required editorial, image-safety, and build checks on the proposed copy; record their results.',
      'Record reviewer identity, decision (approve/reject/request changes), timestamp, and rationale before any human-authorized application.'
    ]
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) throw new Error('Unexpected argument: ' + argv[i]);
    const key = argv[i].slice(2);
    if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Missing value for --' + key);
    args[key] = argv[++i];
  }
  return args;
}
function readJson(file, label) {
  const raw = fs.readFileSync(file, 'utf8');
  try { return { raw, value: JSON.parse(raw) }; }
  catch { throw new Error('Invalid JSON in ' + label + ': ' + file); }
}
export function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  for (const key of ['article', 'report', 'pack', 'metadata', 'proposal', 'output']) if (!args[key]) throw new Error('Required argument --' + key);
  const inputPaths = ['article', 'report', 'pack', 'metadata', 'proposal'].map(key => path.resolve(args[key]));
  const outputPath = path.resolve(args.output);
  if (inputPaths.includes(outputPath)) throw new Error('Refusing to overwrite an input file');
  if (fs.existsSync(outputPath)) throw new Error('Refusing to overwrite an existing output file');
  const articlePath = path.resolve(args.article);
  const report = readJson(path.resolve(args.report), 'claim report');
  const pack = readJson(path.resolve(args.pack), 'evidence pack');
  const metadata = readJson(path.resolve(args.metadata), 'run metadata');
  const proposal = readJson(path.resolve(args.proposal), 'repair proposal');
  const articleRaw = fs.readFileSync(articlePath, 'utf8');
  const result = createFactualRepairProposal({
    articleRaw, articlePath: args.article,
    claimReport: report.value, claimReportRaw: report.raw, claimReportPath: args.report,
    evidencePack: pack.value, evidencePackRaw: pack.raw, evidencePackPath: args.pack,
    metadata: metadata.value, metadataPath: args.metadata, proposal: proposal.value
  });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  process.stdout.write(JSON.stringify({ status: result.status, outputPath, findings: result.findings.length, automaticApplication: false }) + '\n');
  return result.status === 'unknown' ? 2 : result.status === 'blocked' ? 1 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.exitCode = runCli(); }
  catch (error) { process.stderr.write('BOAT Factual Repair Proposal error: ' + error.message + '\n'); process.exitCode = 2; }
}
