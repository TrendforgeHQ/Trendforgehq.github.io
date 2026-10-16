import fs from 'node:fs';
import path from 'node:path';
import { buildPublishedLineageManifest } from './boat-published-lineage-manifest.mjs';

const markerPath = 'data/current-run-article.json';
const read = file => fs.readFileSync(file, 'utf8');
const parseMarker = raw => {
  try { return JSON.parse(raw); } catch { throw new Error('current-run article marker is not valid JSON'); }
};

try {
  if (!fs.existsSync(markerPath)) throw new Error('current-run article marker is missing');
  const markerBytes = read(markerPath);
  const marker = parseMarker(markerBytes);
  if (marker.generated !== true) {
    console.log('Published lineage capture skipped: this workflow run generated no article.');
    process.exit(0);
  }

  const workflowRun = String(process.env.GITHUB_RUN_ID ?? '').trim();
  const workflowSha = String(process.env.GITHUB_SHA ?? '').trim();
  if (!workflowRun || !/^[0-9]+$/.test(workflowRun)) throw new Error('GITHUB_RUN_ID is missing or invalid');
  if (!/^[0-9a-f]{40}$/i.test(workflowSha)) throw new Error('GITHUB_SHA is missing or invalid');

  const articlePath = String(marker.articlePath ?? '');
  if (!/^content\/articles\/[A-Za-z0-9._-]+\.md$/.test(articlePath) || articlePath.includes('..')) {
    throw new Error('current-run article path is invalid; refusing to read outside content/articles');
  }
  for (const required of ['data/claim-verification.json', 'data/authoritative-evidence-pack.json', 'data/article-brief.json']) {
    if (!fs.existsSync(required)) throw new Error(required + ' is missing');
  }

  const manifest = buildPublishedLineageManifest({
    workflowRun,
    workflowSha,
    generatedAt: new Date().toISOString(),
    records: [{
      currentRunArticleJson: markerBytes,
      articleBytes: read(articlePath),
      claimReportBytes: read('data/claim-verification.json'),
      evidencePackBytes: read('data/authoritative-evidence-pack.json'),
      briefBytes: read('data/article-brief.json'),
    }],
  });

  const outputDir = 'data/published-lineage';
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `manifest-${workflowRun}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  console.log(`Published lineage captured for ${manifest.records.length} current-run article(s): ${outputPath}`);
} catch (error) {
  console.error('Published lineage capture failed closed; no PASS manifest was written.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
