import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const workflow = fs.readFileSync('.github/workflows/publish.yml', 'utf8');
const binderStep = workflow.indexOf('name: Bind final claim report to exact attempt bytes');
const uploadStep = workflow.indexOf('name: Upload article attempt diagnostics');
const writerStep = workflow.indexOf('name: Capture published article lineage (diagnostic, non-blocking)');
const manifestUploadStep = workflow.indexOf('name: Upload exact published lineage manifest', writerStep);
const buildStep = workflow.indexOf('name: Build site', writerStep);
const outputCommitStep = workflow.indexOf('name: Commit pipeline output', buildStep);
assert.ok(binderStep >= 0, 'publish workflow must bind final report bytes to the run archive');
assert.ok(uploadStep > binderStep, 'finalized attempt bundle must be created before attempt diagnostics are uploaded');
const attemptUploadBlock = workflow.slice(uploadStep, writerStep);
assert.match(attemptUploadBlock, /data\/authoritative-evidence-pack\.json/, 'downloadable attempt diagnostics must include the canonical evidence pack bytes');
const binderBlock = workflow.slice(binderStep, uploadStep);
assert.ok(binderBlock.includes('continue-on-error: true'), 'attempt lineage binding must not add a new publication gate');
assert.ok(binderBlock.includes('GITHUB_RUN_ID: ${{ github.run_id }}'));
assert.ok(binderBlock.includes('GITHUB_SHA: ${{ github.sha }}'));
assert.ok(binderBlock.includes('node scripts/boat-bind-attempt-lineage.mjs'), 'binder step must invoke the attempt-lineage script');
assert.ok(writerStep >= 0, 'publish workflow must include lineage capture');
assert.ok(buildStep > writerStep, 'lineage capture must happen before site build');
assert.ok(manifestUploadStep > writerStep && manifestUploadStep < buildStep, 'exact lineage manifest must be uploaded after capture and before build');
const manifestUploadBlock = workflow.slice(manifestUploadStep, buildStep);
assert.match(manifestUploadBlock, /uses: actions\/upload-artifact@v4/);
assert.match(manifestUploadBlock, /data\/published-lineage\/manifest-\$\{\{ github\.run_id \}\}\.json/, 'upload must use the exact current-run manifest path');
assert.match(manifestUploadBlock, /if-no-files-found: warn/, 'no-article runs must not fail just because there is no manifest');
assert.ok(outputCommitStep > buildStep, 'lineage output must be committed after build');
const captureBlock = workflow.slice(writerStep, buildStep);
assert.match(captureBlock, /continue-on-error:\s*true/, 'lineage capture must not block existing publication gates');
assert.match(captureBlock, /GITHUB_RUN_ID:\s*\$\{\{ github\.run_id \}\}/);
assert.match(captureBlock, /GITHUB_SHA:\s*\$\{\{ github\.sha \}\}/);
assert.match(captureBlock, /node scripts\/write-boat-published-lineage-manifest\.mjs/);
const outputBlock = workflow.slice(outputCommitStep);
assert.match(outputBlock, /git add data(?:\s|$)/, 'normal output commit must stage lineage manifests under data/');
assert.match(outputBlock, /git diff-tree[\s\S]*-- data lib\/articles\.ts public\/images\/articles content\/articles/, 'generated-file transfer allowlist must include data/');
assert.match(outputBlock, /git checkout "\$output_commit" -- "\$path"/, 'generated data must be transferred from the pipeline output commit');
assert.match(outputBlock, /git push origin HEAD:main/, 'existing output publishing path must remain explicit');

const commitRunMatch = outputBlock.match(/run: \\|\\r?\\n([\\s\\S]*)$/);
assert.ok(commitRunMatch, 'output commit step must retain its shell run block');
const commitShell = commitRunMatch[1].split(/\\r?\\n/)
  .map(line => line.startsWith('          ') ? line.slice(10) : line)
  .join('\\n');
const shellSyntax = spawnSync('bash', ['-n', '-c', commitShell], { encoding: 'utf8' });
assert.equal(shellSyntax.status, 0, 'output commit shell must pass bash -n: ' + shellSyntax.stderr);


const writer = fs.readFileSync('scripts/write-boat-published-lineage-manifest.mjs', 'utf8');
assert.match(writer, /flag:\s*'wx'/, 'manifest writer must refuse overwriting a run manifest');
assert.match(writer, /Published lineage capture skipped: this workflow run generated no article/, 'no-article run must be a no-op');
assert.match(writer, /Published lineage capture failed closed; no PASS manifest was written/, 'invalid inputs must fail closed');
assert.match(writer, /const outputDir = 'data\/published-lineage'/, 'manifest must be written under the published-lineage data directory');
assert.match(writer, /manifest-\$\{workflowRun\}\.json/, 'manifest filename must be scoped to the current workflow run');
assert.match(outputBlock, /git diff-tree[\s\S]*-- data lib\/articles\.ts public\/images\/articles content\/articles/, 'generated-file transfer allowlist must include data/');

assert.match(outputBlock, /log_pack_worktree\(\)/, 'pipeline must record exact evidence-pack bytes and hashes at transfer checkpoints');
assert.ok(outputBlock.includes('log_pack_worktree "pre-output-commit"'), 'log evidence-pack state before the first output commit');
assert.match(outputBlock, /EVIDENCE_PACK_PERSISTENCE stage=output-commit/, 'record evidence-pack Git blob and byte size in the first output commit');
assert.match(outputBlock, /git cat-file -s/, 'measure the persisted blob size rather than relying only on the worktree file');
assert.ok(outputBlock.includes('log_pack_worktree "post-transfer-staging"'), 'record evidence-pack bytes after transfer to the main-based worktree');
assert.match(outputBlock, /git ls-files -s -- data\/authoritative-evidence-pack\.json/, 'inspect the staged transfer blob');
assert.match(outputBlock, /transfer-mismatch/, 'surface transfer mismatch explicitly in logs');
assert.match(outputBlock, /transfer=unknown/, 'report missing blob bindings as unknown');
const offlineWorkflow = fs.readFileSync('.github/workflows/boat-offline-tests.yml', 'utf8');
assert.match(offlineWorkflow, /"scripts\/boat-numeric-claim-coverage-audit\.mjs"/, 'offline workflow path filter must include the numeric audit implementation');
assert.match(offlineWorkflow, /"scripts\/test-boat-numeric-claim-coverage-audit\.mjs"/, 'offline workflow path filter must include the numeric audit regression test');

console.log('BOAT lineage workflow persistence contract: PASS');
