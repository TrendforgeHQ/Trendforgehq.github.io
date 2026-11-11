import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(here, 'write-boat-published-lineage-manifest.mjs');
const run = '38126000002';
const sha = 'b'.repeat(40);
const article = '---\ntitle: "Alpha Story: New Development"\nslug: alpha\n---\n## Evidence\nA supported article body.\n';
const marker = {
  version: 1, generated: true, runId: run,
  articlePath: 'content/articles/alpha.md', briefTitle: 'Alpha Story: New Development',
};
const report = {
  version: 18, generatedAt: '2026-10-11T10:00:00.000Z',
  articlePath: marker.articlePath, articleTitle: marker.briefTitle,
  claimCount: 1, pass: true, claims: [{ index: 1, claim: 'A test claim', status: 'verified' }],
};
const candidatePack = {
  version: 1, status: 'authoritative',
  candidate: { title: marker.briefTitle, link: 'https://example.com/story', category: 'Technology' },
  sources: [{
    id: 'S1', url: 'https://example.com/source', finalUrl: 'https://example.com/source',
    domain: 'example.com', publisherFamily: 'example', title: 'Alpha source',
    verified: true, primary: false, sourceRole: 'DIRECT_REPORTING', credibilityTier: 'high',
    lineage: { id: 'lineage-test', type: 'article', members: 1 },
    passages: ['A concrete supporting passage.'], body: 'A concrete supporting article body.',
  }],
  coverage: {}, blueprint: {}, evidenceBrief: null,
};
const env = { ...process.env, GITHUB_RUN_ID: run, GITHUB_SHA: sha };
function fixture() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-lineage-cli-'));
  fs.mkdirSync(path.join(cwd, 'data'), { recursive: true });
  fs.mkdirSync(path.join(cwd, 'content/articles'), { recursive: true });
  fs.writeFileSync(path.join(cwd, marker.articlePath), article);
  fs.writeFileSync(path.join(cwd, 'data/current-run-article.json'), JSON.stringify(marker));
  fs.writeFileSync(path.join(cwd, 'data/claim-verification.json'), JSON.stringify(report));
  fs.writeFileSync(path.join(cwd, 'data/authoritative-evidence-pack.json'), JSON.stringify({ version: 1, status: 'authoritative', candidates: [candidatePack] }));
  fs.writeFileSync(path.join(cwd, 'data/article-brief.json'), JSON.stringify({ brief: { title: marker.briefTitle } }));
  return cwd;
}

const cwd = fixture();
try {
  const success = spawnSync(process.execPath, [cliPath], { cwd, env, encoding: 'utf8' });
  assert.equal(success.status, 0, success.stderr);
  const outputPath = path.join(cwd, `data/published-lineage/manifest-${run}.json`);
  const manifest = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.equal(manifest.workflowRun, run);
  assert.equal(manifest.workflowSha, sha);
  assert.equal(manifest.records.length, 1);
  assert.equal(manifest.records[0].hashes.articleSha256.length, 64);
  assert.equal(manifest.records[0].claimVerification.status, 'pass');

  const before = fs.readFileSync(outputPath, 'utf8');
  const overwrite = spawnSync(process.execPath, [cliPath], { cwd, env, encoding: 'utf8' });
  assert.notEqual(overwrite.status, 0);
  assert.match(overwrite.stderr, /no PASS manifest was written/);
  assert.equal(fs.readFileSync(outputPath, 'utf8'), before, 'existing manifest must not be overwritten');

  // No article is an expected no-op, not a pipeline blocker and not a false PASS.
  fs.writeFileSync(path.join(cwd, 'data/current-run-article.json'), JSON.stringify({ ...marker, generated: false, articlePath: null }));
  fs.rmSync(outputPath);
  const skipped = spawnSync(process.execPath, [cliPath], { cwd, env, encoding: 'utf8' });
  assert.equal(skipped.status, 0, skipped.stderr);
  assert.match(skipped.stdout, /generated no article/);
  assert.equal(fs.existsSync(outputPath), false);

  // Generated=true with a non-PASS claim report must fail closed.
  fs.writeFileSync(path.join(cwd, 'data/current-run-article.json'), JSON.stringify(marker));
  fs.writeFileSync(path.join(cwd, 'data/claim-verification.json'), JSON.stringify({ ...report, pass: false }));
  const blocked = spawnSync(process.execPath, [cliPath], { cwd, env, encoding: 'utf8' });
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /no PASS manifest was written/);
  assert.equal(fs.existsSync(outputPath), false);
} finally {
  fs.rmSync(cwd, { recursive: true, force: true });
}
console.log('BOAT published lineage CLI integration tests: PASS');
