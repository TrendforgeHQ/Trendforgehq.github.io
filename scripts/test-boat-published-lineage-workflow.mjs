import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/publish.yml', 'utf8');
const binderStep = workflow.indexOf('name: Bind final claim report to exact attempt bytes');
const uploadStep = workflow.indexOf('name: Upload article attempt diagnostics');
const writerStep = workflow.indexOf('name: Capture published article lineage (diagnostic, non-blocking)');
const buildStep = workflow.indexOf('name: Build site', writerStep);
const outputCommitStep = workflow.indexOf('name: Commit pipeline output', buildStep);
assert.ok(binderStep >= 0, 'publish workflow must bind final report bytes to the run archive');
assert.ok(uploadStep > binderStep, 'finalized attempt bundle must be created before attempt diagnostics are uploaded');
const binderBlock = workflow.slice(binderStep, uploadStep);
assert.match(binderBlock, /continue-on-error:\\s*true/, 'attempt lineage binding must not add a new publication gate');
assert.match(binderBlock, /GITHUB_RUN_ID:\\s*\\$\\{\\{ github\\.run_id \\}\\}/);
assert.match(binderBlock, /GITHUB_SHA:\\s*\\$\\{\\{ github\\.sha \\}\\}/);
assert.match(binderBlock, /node scripts\\/boat-bind-attempt-lineage\\.mjs/);
assert.ok(writerStep >= 0, 'publish workflow must include lineage capture');
assert.ok(buildStep > writerStep, 'lineage capture must happen before site build');
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

const writer = fs.readFileSync('scripts/write-boat-published-lineage-manifest.mjs', 'utf8');
assert.match(writer, /flag:\s*'wx'/, 'manifest writer must refuse overwriting a run manifest');
assert.match(writer, /Published lineage capture skipped: this workflow run generated no article/, 'no-article run must be a no-op');
assert.match(writer, /Published lineage capture failed closed; no PASS manifest was written/, 'invalid inputs must fail closed');
assert.match(writer, /const outputDir = 'data\/published-lineage'/, 'manifest must be written under the published-lineage data directory');
assert.match(writer, /manifest-\$\{workflowRun\}\.json/, 'manifest filename must be scoped to the current workflow run');
assert.match(outputBlock, /git diff-tree[\s\S]*-- data lib\/articles\.ts public\/images\/articles content\/articles/, 'generated-file transfer allowlist must include data/');

console.log('BOAT lineage workflow persistence contract: PASS');
