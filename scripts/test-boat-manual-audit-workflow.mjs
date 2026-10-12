import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflowPath = path.join(root, '.github/workflows/boat-manual-audit.yml');
const source = fs.readFileSync(workflowPath, 'utf8');

test('manual BOAT audit has no automatic trigger and uses read-only repository permissions', () => {
  assert.match(source, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(source, /^  (push|pull_request|schedule):/m);
  assert.match(source, /^permissions:\n  contents: read\n  actions: read$/m);
  assert.doesNotMatch(source, /^  (contents|actions): write$/m);
  assert.match(source, /persist-credentials: false/);
  assert.match(source, /actions\/upload-artifact@v4/);
  assert.match(source, /actions\/download-artifact@v4/);
  assert.match(source, /Discover saved task ID after interruption/);
  assert.match(source, /name: boat-audit-summary-/);
  assert.match(source, /runner\.temp \}\}\/boat-state\/\*\.json/);
  assert.match(source, /retention-days: 14/);
  assert.match(source, /name: Validate prior task checkpoint manifest/);
  assert.match(source, /boat-task-artifact-manifest\.mjs --mode validate/);
  assert.match(source, /name: Build checkpoint provenance manifest/);
  assert.match(source, /boat-task-artifact-manifest\.mjs --mode create/);
  assert.match(source, /name: Validate and import canonical task-store artifact/);
  assert.match(source, /boat-task-store-artifact\.mjs --mode validate/);
  assert.match(source, /boat-task-store-artifact\.mjs --mode import/);
  assert.match(source, /--task-store/);
  assert.match(source, /name: Build portable canonical task-store artifact/);
  assert.match(source, /boat-task-store-artifact\.mjs --mode create/);
  assert.match(source, /boat-task-store-portable\.json/);
  assert.match(source, /!.*boat-task-store\.json/);
  assert.match(source, /steps\.validate_checkpoint\.outcome == 'success'/);
  assert.ok(source.indexOf('name: Validate prior task checkpoint manifest') < source.indexOf('name: Run BOAT audit'));
  assert.ok(source.indexOf('name: Build checkpoint provenance manifest') < source.indexOf('name: Upload portable task checkpoint and report'));
});

test('manual BOAT workflow is isolated from production publishing and paid providers', () => {
  assert.doesNotMatch(source, /publish\.yml|workflow_dispatch.*publish|OPENAI_API_KEY|GEMINI_API_KEY|GROQ_API_KEY|OPENROUTER_API_KEY|COHERE_API_KEY/);
  assert.match(source, /scripts\/boat-run-catalogue-task\.mjs/);
  assert.match(source, /resume_task_id and resume_run_id must be supplied together/);
  assert.match(source, /Resuming requires the exact original audit_commit_sha/);
});
