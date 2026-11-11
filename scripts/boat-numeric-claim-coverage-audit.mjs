#!/usr/bin/env node
/**
 * Read-only coverage-gap signal for numeric factual sentences absent from the saved verifier claim list.
 * This is a review heuristic, not a factual verdict; it never edits or publishes article content.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const text = value => typeof value === 'string' ? value.trim() : '';
const normalize = value => String(value ?? '').normalize('NFKC').replace(/[\u00a0\u2000-\u200b\u202f\u205f\u3000]/g, ' ').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
const meaningfulTokens = value => new Set(normalize(value).replace(/[^a-z0-9$%.,' -]/g, ' ').split(/\s+/).filter(token => token.length >= 3 && !['the','and','that','this','with','from','into','after','before','when','while','would','could','about','amid','then','than','their','they','have','has','had','will','what','where','which','were','been','being','part','more','less','once','also','only'].includes(token)));
const numericTokens = value => {
  const matches = normalize(value).match(/(?:[$€£₹]\s*)?\d[\d,]*(?:\.\d+)?\s*(?:billion|million|trillion|bn|mn|percent|%|thousand|k)?/g) ?? [];
  return matches.map(item => item.replace(/\s+/g, '').replace(/,/g, '').replace(/(billion|million|trillion|percent|thousand)$/, unit => ({billion:'b',million:'m',trillion:'t',percent:'%',thousand:'k'}[unit] || unit))).filter(item => /\d/.test(item));
};
const hasMaterialNumericClaim = sentence => /[$€£₹]\s*\d|\b\d[\d,.]*\s*(?:billion|million|trillion|bn|mn|percent|%|thousand)\b/i.test(sentence);
const stripMarkdown = raw => {
  let value = String(raw ?? '').replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  value = value.split(/^##?\s+Sources\s*$/im)[0] ?? value;
  return value.split('\n').filter(line => !/^\s{0,3}#{1,6}\s/.test(line)).join(' ').replace(/\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
};
const splitSentences = raw => stripMarkdown(raw).split(/(?<=[.!?])\s+(?=[A-Z0-9“"'‘])/u).map(text).filter(Boolean);

export function auditNumericClaimCoverage({ articleRaw, report }) {
  const claims = Array.isArray(report?.claims) ? report.claims : [];
  const sentences = splitSentences(articleRaw);
  const numericSentences = sentences.filter(hasMaterialNumericClaim);
  const rows = numericSentences.map((sentence, index) => {
    const numbers = numericTokens(sentence);
    const sentenceTokens = meaningfulTokens(sentence);
    const candidates = claims.map((claim, claimIndex) => {
      const claimText = text(claim?.claim);
      const claimNumbers = new Set(numericTokens(claimText));
      const overlap = [...sentenceTokens].filter(token => meaningfulTokens(claimText).has(token)).length;
      return { claimIndex: Number.isInteger(claim?.index) ? claim.index : claimIndex + 1, claimText, savedVerifierStatus: text(claim?.status) || 'unknown', matchedNumbers: numbers.filter(number => claimNumbers.has(number)), overlap };
    }).filter(candidate => candidate.matchedNumbers.length > 0 && candidate.overlap >= 3);
    const coveredNumbers = new Set(candidates.flatMap(candidate => candidate.matchedNumbers));
    const missingNumbers = numbers.filter(number => !coveredNumbers.has(number));
    const covered = numbers.length > 0 && missingNumbers.length === 0 && candidates.length > 0;
    return {
      sentenceIndex: index + 1,
      sentence,
      numericTokens: numbers,
      status: covered ? 'numeric-claim-text-covered-by-saved-verifier-claim' : 'review-numeric-claim-coverage-gap',
      missingNumericTokens: missingNumbers,
      matchedVerifierClaims: candidates.map(candidate => ({ claimIndex: candidate.claimIndex, status: candidate.savedVerifierStatus, matchedNumbers: candidate.matchedNumbers, claimText: candidate.claimText })),
      note: 'Coverage matching is lexical and numeric only. A match does not prove correctness; a gap means the saved claim list may not cover this sentence and requires review.'
    };
  });
  const gaps = rows.filter(row => row.status === 'review-numeric-claim-coverage-gap');
  return {
    schemaVersion: 1,
    reportType: 'boat-numeric-claim-coverage-gap-audit',
    readOnly: true,
    automaticRepair: false,
    automaticPublicationDecision: false,
    verifierReport: {
      present: Boolean(report && typeof report === 'object'),
      savedPass: typeof report?.pass === 'boolean' ? report.pass : null,
      savedClaimCount: Number.isFinite(Number(report?.claimCount)) ? Number(report.claimCount) : claims.length,
      actualClaimRows: claims.length,
      articlePath: text(report?.articlePath) || null,
      reportGeneratedAt: text(report?.generatedAt) || null
    },
    summary: {
      numericSentences: rows.length,
      coveredBySavedClaimText: rows.length - gaps.length,
      reviewGaps: gaps.length,
      savedVerifierPassWithCoverageGaps: report?.pass === true && gaps.length > 0
    },
    findings: rows,
    limitations: [
      'This deterministic audit only flags numeric-bearing sentences whose number tokens are not covered by a lexically related saved verifier claim.',
      'It does not fetch sources, validate units, establish factual truth, or re-run the verifier.',
      'A coverage match is not proof of semantic support; all gaps are review signals, not automatic rejection decisions.',
      'Article text and verifier report are read-only inputs; no repair or publication action occurs.'
    ]
  };
}

function main() {
  const root = path.resolve(process.env.BOAT_AUDIT_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const reportPath = path.join(root, 'data', 'claim-verification.json');
  let report = null;
  try { report = JSON.parse(fs.readFileSync(reportPath, 'utf8')); } catch {}
  const articlePath = text(report?.articlePath).replace(/^\.\//, '');
  const safeArticlePath = /^content\/articles\/[A-Za-z0-9._-]+\.md$/.test(articlePath) && !articlePath.includes('..');
  let articleRaw = null;
  if (safeArticlePath) { try { articleRaw = fs.readFileSync(path.join(root, articlePath), 'utf8'); } catch {} }
  const result = auditNumericClaimCoverage({ articleRaw, report });
  if (articleRaw === null) {
    result.summary.inputStatus = 'unknown-article-missing-or-invalid-path';
    result.limitations.push('The report article path did not resolve to a readable canonical article; numeric coverage is unknown.');
  } else result.summary.inputStatus = 'read-only-article-and-report-loaded';
  process.stdout.write(JSON.stringify(result, null, 2) + String.fromCharCode(10));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
