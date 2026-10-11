import fs from 'node:fs';

const page = fs.readFileSync('app/control-center/page.tsx', 'utf8');
const css = fs.readFileSync('app/control-center/control-center.css', 'utf8');

const checks = [
  ['overview section', page.includes('Today at a glance')],
  ['pipeline health', page.includes('Pipeline health')],
  ['publishing desk', page.includes('PUBLISHING DESK')],
  ['evidence detail', page.includes('Research & Evidence')],
  ['article quality chain', page.includes('Quality chain')],
  ['provider center', page.includes('AI PROVIDERS')],
  ['supervisor detail', page.includes('What needs attention')],
  ['performance and learning', page.includes('PERFORMANCE & LEARNING')],
  ['security section', page.includes('Security & Reliability')],
  ['audit timeline', page.includes('Audit timeline')],
  ['monetization section', page.includes('Revenue readiness')],
  ['plain language explanation', page.includes('How to read this Control Center')],
  ['no threshold override', page.includes('cannot lower thresholds')],
  ['no evidence bypass', page.includes('bypass evidence')],
  ['no safety bypass', page.includes('bypass safety')],
  ['no auto publish', page.includes('auto-publish')],
  ['unknown status is not green', page.includes("state === 'good' ? '🟢' : state === 'watch' ? '🟡' : '⚪'")],
  ['responsive mobile layout', css.includes('@media(max-width:620px)')],
  ['committed memory source', page.includes("readJson('trendforge-memory.json')")],
  ['committed performance source', page.includes("readJson('trendforge-performance.json')")],
  ['committed learning source', page.includes("readJson('trendforge-learning.json')")],
  ['no missing supervisor file dependency', !page.includes("readJson('trendforge-supervisor.json')")],
  ['no missing audit file dependency', !page.includes("readJson('trendforge-audit-trail.json')")],
  ['no missing security file dependency', !page.includes("readJson('trendforge-security-reliability.json')")],
  ['no missing monetization file dependency', !page.includes("readJson('trendforge-monetization-intelligence.json')")],
  ['provider responsive layout', css.includes('.cc-provider-grid')],
  ['audit responsive layout', css.includes('.cc-audit-row')],
  ['published catalogue audit section', page.includes('Published article audit')],
  ['catalogue scanner import', page.includes("auditPublishedCatalogue(path.join(process.cwd(), 'content', 'articles'))")],
  ['catalogue audit limitation is explicit', page.includes('Claim-to-passage support, source freshness, attribution accuracy, and public-web verification are not yet run')],
  ['missing catalogue is not a pass', page.includes('This is an inventory failure/unknown state, not a clean audit')],
  ['catalogue findings table', page.includes('cc-catalogue-table')],
  ['catalogue responsive styles', css.includes('.cc-catalogue-stats')],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}`);
  if (ok) passed++;
}
if (passed !== checks.length) process.exit(1);
console.log(`Phase 25 Detailed Control Center deterministic suite: PASS (${passed}/${checks.length} checks)`);
