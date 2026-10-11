import fs from 'node:fs';
import path from 'node:path';
import './control-center.css';
import { auditPublishedCatalogue } from '../../scripts/boat-published-catalogue-audit.mjs';
import { articles as publishedArticles } from '../../lib/articles';

export const dynamic = 'force-static';

function readJson(name: string): any {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', name), 'utf8')); }
  catch { return null; }
}
function fmt(v: any, fallback = '—') { return v === null || v === undefined || v === '' ? fallback : String(v); }
function arr(v: any) { return Array.isArray(v) ? v : []; }
function pct(a: any, b: any) { const x = Number(a), y = Number(b); return y > 0 ? `${Math.round((x / y) * 100)}%` : '—'; }

const memory = readJson('trendforge-memory.json');
const performance = readJson('trendforge-performance.json');
const learning = readJson('trendforge-learning.json');
const runs = arr(memory?.runs);
const latest = runs[runs.length - 1] ?? {};
const decisions = latest.decisions ?? {};
const evidence = latest.evidence ?? {};
const claims = latest.claims ?? {};
const editorial = latest.editorial ?? {};
const lifecycle = latest.lifecycle ?? {};
const distribution = latest.distribution ?? {};
const providers = latest.providers ?? {};
const performanceBottlenecks = arr(performance?.bottlenecks);
const health = performanceBottlenecks.some((b:any) => b?.severity === 'high') ? 'attention' : performanceBottlenecks.length ? 'watch' : 'healthy';
const healthLabel = health === 'healthy' ? 'Running normally' : health === 'attention' ? 'Attention needed' : 'Watch required';
const healthIcon = health === 'healthy' ? '🟢' : health === 'attention' ? '🟡' : '🟠';
const bottlenecks = performanceBottlenecks;
const recommendations = performanceBottlenecks.slice(0, 3).map((b:any) => ({ action: 'Investigate', reason: b?.detail ?? 'Review the reported bottleneck.' }));
const auditEvents = runs.length;
const providerEntries = Object.entries(providers) as [string, any][];
const articleCount = Number(editorial.articleCount ?? latest.articleCount ?? 0);
const evidencePassed = Number(evidence.passed ?? 0);
const evidenceBlocked = Number(evidence.blocked ?? 0);
const singleSource = Number(evidence.singleSource ?? decisions.singleSourceVerifiedReady ?? 0);
const strongEvidence = Number(evidence.strong ?? decisions.strongEvidenceReady ?? 0);
const generated = Number(latest.articlesGenerated ?? latest.generatedArticles ?? articleCount ?? 0);

const publishedCatalogue = auditPublishedCatalogue(publishedArticles);
const catalogueIssueArticles = publishedCatalogue.filter((article) => article.findings.length > 0);
const catalogueMissingSources = publishedCatalogue.filter((article) => !article.sourceHeading || article.urls === 0).length;
const catalogueEmptyHeadings = publishedCatalogue.reduce((sum, article) => sum + article.emptyHeadings, 0);
const catalogueRepeatedParagraphs = publishedCatalogue.reduce((sum, article) => sum + article.repeatedParagraphs, 0);

function Card({label, value, help}: {label:string; value:any; help:string}) {
  return <div className="cc-card"><div className="cc-label">{label}</div><div className="cc-value">{fmt(value)}</div><div className="cc-help">{help}</div></div>;
}
function Status({name, state, help}: {name:string; state:'good'|'watch'|'unknown'; help:string}) {
  const icon = state === 'good' ? '🟢' : state === 'watch' ? '🟡' : '⚪';
  return <div className="cc-status"><span>{icon}</span><div><strong>{name}</strong><small>{help}</small></div></div>;
}
function Section({eyebrow, title, children, help}: {eyebrow:string; title:string; children:React.ReactNode; help:string}) {
  return <section className="cc-section"><div className="cc-section-title"><div className="cc-label">{eyebrow}</div><h2>{title}</h2><p>{help}</p></div>{children}</section>;
}

export default function ControlCenterPage() {
  const evidenceState = evidencePassed > 0 ? 'good' : 'watch';
  const claimState = claims.pass === true ? 'good' : claims.claimCount ? 'watch' : 'unknown';
  const securityState = 'unknown';
  const auditState = auditEvents > 0 ? 'good' : 'unknown';
  return <main className="cc-page">
    <header className="cc-hero">
      <div><p className="cc-eyebrow">TREND FORGE • PHASE 25</p><h1>Control Center</h1><p>One simple command view of what TrendForge is doing, where work is stuck, and why.</p></div>
      <div className="cc-health"><span>{healthIcon}</span><div><strong>{healthLabel}</strong><small>Supervisor status • observational only</small></div></div>
    </header>


    <Section eyebrow="BOAT • CATALOGUE AUDIT" title="Published article audit" help="Build-time structural scan of the canonical published article index used to render /article pages. This is a real inventory, not a claim that factual accuracy has been verified.">
      <div className="cc-catalogue-note"><strong>Audit boundary</strong><p>Structural checks only: article inventory, source/reference heading, HTTP(S) links, empty headings, and repeated paragraphs. Claim-to-passage support, source freshness, attribution accuracy, and public-web verification are not yet run by this Control Center. Missing or unchecked evidence must not be interpreted as passed.</p><small>Snapshot generated when the site is built • {publishedCatalogue.length} published article(s) scanned</small></div>
      <div className="cc-catalogue-stats">
        <div><b>{publishedCatalogue.length}</b><span>Articles inventoried</span></div>
        <div><b>{catalogueIssueArticles.length}</b><span>With structural flags</span></div>
        <div><b>{catalogueMissingSources}</b><span>Missing source heading or links</span></div>
        <div><b>{catalogueEmptyHeadings + catalogueRepeatedParagraphs}</b><span>Empty headings + repeated paragraphs</span></div>
      </div>
      {publishedCatalogue.length ? <div className="cc-catalogue-table-wrap"><table className="cc-catalogue-table"><thead><tr><th>Article</th><th>Words</th><th>Links</th><th>Structural findings</th></tr></thead><tbody>
        {publishedCatalogue.slice(0, 20).map((article) => <tr key={article.slug}><td><strong>{article.title}</strong><small>{article.slug}</small></td><td>{article.words}</td><td>{article.urls}</td><td>{article.findings.length ? article.findings.join(' • ') : 'No structural flags detected'}</td></tr>)}
      </tbody></table>{publishedCatalogue.length > 20 && <p className="cc-catalogue-more">Showing 20 of {publishedCatalogue.length} published articles, ordered by number of structural flags.</p>}</div> : <div className="cc-empty">No published articles were available in the canonical article index during this build. This is an inventory failure/unknown state, not a clean audit.</div>}
    </Section>

    <Section eyebrow="01 • OVERVIEW" title="Today at a glance" help="The latest recorded publishing run, translated into plain language.">
      <div className="cc-grid">
        <Card label="Topics found" value={decisions.total ?? evidence.candidates} help="Topics discovered and evaluated." />
        <Card label="Evidence ready" value={decisions.singleSourceVerifiedReady ?? singleSource} help="Topics with at least one validated publisher source." />
        <Card label="Articles generated" value={generated || articleCount} help="Articles recorded from the latest run." />
        <Card label="Publish candidates" value={decisions.publishCandidates ?? 0} help="Articles that cleared the decision stage." />
      </div>
      <div className="cc-flow"><div><b>{fmt(decisions.total ?? evidence.candidates, '0')}</b><span>topics evaluated</span></div><i>→</i><div><b>{fmt(singleSource, '0')}</b><span>single-source ready</span></div><i>→</i><div><b>{fmt(generated || articleCount, '0')}</b><span>articles produced</span></div><i>→</i><div><b>{fmt(decisions.publishCandidates ?? 0, '0')}</b><span>publish candidates</span></div></div>
    </Section>

    <Section eyebrow="02 • PIPELINE" title="Pipeline health" help="A green stage is healthy according to its available telemetry. Yellow means something needs investigation. White means the snapshot is missing, not that the stage passed.">
      <div className="cc-status-grid">
        <Status name="Research & Evidence" state={evidenceState} help={`${fmt(evidencePassed,'0')} passed • ${fmt(evidenceBlocked,'0')} blocked • ${fmt(strongEvidence,'0')} strong`} />
        <Status name="Claim Verification" state={claimState} help={claims.claimCount ? `${fmt(claims.verified,'0')} verified • ${fmt(claims.unsupported,'0')} unsupported • avg ${fmt(claims.averageConfidence,'—')}` : 'No claim snapshot available'} />
        <Status name="Editorial Quality" state={editorial.status === 'pass' ? 'good' : editorial.status ? 'watch' : 'unknown'} help={editorial.articleCount ? `${fmt(editorial.articleCount,'0')} articles • avg score ${fmt(editorial.averageScore,'—')}` : 'No editorial snapshot available'} />
        <Status name="Supervisor" state={health === 'healthy' ? 'good' : health === 'attention' || health === 'watch' ? 'watch' : 'unknown'} help={`${bottlenecks.length} bottleneck(s) detected`} />
        <Status name="Security & Reliability" state={securityState} help="Security telemetry is not part of the committed static snapshot." />
        <Status name="Audit Trail" state={auditState} help={auditEvents ? `${auditEvents} audit event(s) retained.` : 'Audit snapshot not available in this build.'} />
      </div>
    </Section>

    <Section eyebrow="03 • PUBLISHING DESK" title="Where articles stand" help="This is a status board, not an override panel. TrendForge keeps its existing publication gates intact.">
      <div className="cc-board">
        <div><span>📰 Published</span><b>{fmt(latest.publishedCount ?? latest.published, '0')}</b><small>Already live</small></div>
        <div><span>✍️ In production</span><b>{fmt(generated || articleCount, '0')}</b><small>Generated / being processed</small></div>
        <div><span>🔎 Review</span><b>{fmt(decisions.review, '0')}</b><small>Needs another decision</small></div>
        <div><span>⏸️ Held</span><b>{fmt(decisions.hold, '0')}</b><small>Waiting for conditions</small></div>
        <div><span>🚫 Rejected</span><b>{fmt(decisions.reject, '0')}</b><small>Not suitable for publication</small></div>
      </div>
      <div className="cc-callout"><strong>Why are publish candidates at {fmt(decisions.publishCandidates,'0')}?</strong><p>TrendForge only moves an article forward when the required evidence, writing, claim verification, editorial and safety checks are satisfied. A high topic score alone does not publish an article.</p></div>
    </Section>

    <div className="cc-two">
      <Section eyebrow="04 • EVIDENCE" title="Research & Evidence" help="Evidence readiness is separate from topic popularity. Discovery feeds are not treated as evidence.">
        <div className="cc-mini-grid"><Card label="Candidates" value={evidence.candidates} help="Topics entering evidence evaluation."/><Card label="Passed" value={evidencePassed} help={`${pct(evidencePassed,evidence.candidates)} of candidates.`}/><Card label="Single source" value={singleSource} help="At least one validated publisher."/><Card label="Strong" value={strongEvidence} help="Independent publisher-family coverage."/></div>
        <div className="cc-reason"><b>Common meaning</b><p>Single-source readiness means generation may be allowed, but the article still has to pass downstream verification. Strong multi-source evidence is preferred, not a shortcut around other gates.</p></div>
      </Section>
      <Section eyebrow="05 • ARTICLE QUALITY" title="Quality chain" help="Every article is checked through multiple independent quality layers.">
        <div className="cc-chain"><span>Writer</span><b>→</b><span>Claims</span><b>→</b><span>Grounding</span><b>→</b><span>Editorial</span><b>→</b><span>Safety</span><b>→</b><span>SEO</span></div>
        <div className="cc-quality-stats"><div><b>{fmt(claims.verified,'0')}</b><span>claims verified</span></div><div><b>{fmt(claims.averageConfidence,'—')}</b><span>claim confidence</span></div><div><b>{fmt(editorial.averageScore,'—')}</b><span>editorial score</span></div></div>
      </Section>
    </div>

    <Section eyebrow="06 • AI PROVIDERS" title="Provider center" help="Provider failures are operational signals. A quota or timeout does not change evidence or quality rules.">
      {providerEntries.length ? <div className="cc-provider-grid">{providerEntries.map(([name,p]) => <div className="cc-provider" key={name}><div><strong>{name}</strong><span>{p?.inCooldown ? '🟡 Cooldown' : p?.lastClass === 'quota' ? '🟡 Quota' : p?.successes ? '🟢 Available history' : '⚪ No recent success'}</span></div><p>Successes: {fmt(p?.successes,'0')} • Failures: {fmt(p?.failures,'0')}</p><small>Last: {fmt(p?.lastClass,'unknown')} {p?.lastStatus ? `• status ${p.lastStatus}` : ''}</small></div>)}</div> : <div className="cc-empty">No provider snapshot available.</div>}
    </Section>

    <div className="cc-two">
      <Section eyebrow="07 • SUPERVISOR" title="What needs attention" help="Phase 23 diagnoses bottlenecks and offers bounded recommendations. It does not repair or override gates here.">
        {bottlenecks.length ? <div className="cc-list">{bottlenecks.slice(0,6).map((b:any,i:number)=><div className="cc-list-row" key={i}><strong>{b.name ?? b.type ?? 'Bottleneck'}</strong><span>{b.reason ?? b.message ?? 'Needs investigation.'}</span></div>)}</div> : <div className="cc-empty">No current bottlenecks detected in the available snapshot.</div>}
        {recommendations.length > 0 && <div className="cc-recommend"><b>Recommended next checks</b>{recommendations.map((r:any,i:number)=><p key={i}>• {r.action ?? 'Review'} — {r.reason ?? r.description ?? 'Inspect the affected stage.'}</p>)}</div>}
      </Section>
      <Section eyebrow="08 • PERFORMANCE & LEARNING" title="What TrendForge is learning" help="These layers are observational/shadow intelligence. They do not silently change publishing decisions.">
        <div className="cc-learning"><div><b>{fmt(performance?.runs,'0')}</b><span>runs analysed</span></div><div><b>{fmt(performance?.insights?.length,'0')}</b><span>performance insights</span></div><div><b>{fmt(learning?.signals?.length,'0')}</b><span>learning signals</span></div></div>
        <div className="cc-reason"><b>Safety rule</b><p>Performance and learning can identify patterns and bottlenecks, but the current contracts keep them out of publication gates.</p></div>
      </Section>
    </div>

    <Section eyebrow="09 • SECURITY" title="Security & Reliability" help="Operational health is shown separately from content quality.">
      <div className="cc-security-grid"><div><b>UNKNOWN</b><span>Security snapshot</span></div><div><b>—</b><span>checks passed</span></div><div><b>{fmt(performance?.metrics?.articleCount,'—')}</b><span>articles analysed</span></div><div><b>{fmt(performance?.metrics?.runCount,'—')}</b><span>runs analysed</span></div></div>
    </Section>

    <div className="cc-two">
      <Section eyebrow="10 • AUDIT" title="Audit timeline" help="Phase 24 records operational history without influencing decisions.">
        <div className="cc-audit-head"><b>{auditEvents || '—'}</b><span>events retained</span></div>
        {runs.slice(-5).reverse().map((run:any,i:number)=><div className="cc-audit-row" key={run?.workflowRun ?? i}><span>{run?.recordedAt ? new Date(run.recordedAt).toLocaleString() : 'Recorded run'}</span><b>Publishing run {run?.workflowRun ?? '—'}</b><small>{fmt(run?.decisions?.publishCandidates,'0')} publish candidate(s) • {fmt(run?.editorial?.articleCount,'0')} article(s)</small></div>)}
        {!auditEvents && <div className="cc-empty">No historical run snapshot is available.</div>}
      </Section>
      <Section eyebrow="11 • MONETIZATION" title="Revenue readiness" help="Monetization intelligence observes fit and readiness; it does not lower editorial or safety standards.">
        <div className="cc-monetize"><div><b>{latest.monetization?.readyForAdSenseFoundation === true ? 'Ready' : 'Not ready'}</b><span>Ad foundation</span></div><div><b>{fmt(latest.monetization?.articleCount,'—')}</b><span>articles assessed</span></div><div><b>{fmt(latest.monetization?.evergreenCount ?? '—')}</b><span>evergreen opportunities</span></div></div>
      </Section>
    </div>

    <section className="cc-explain"><h2>❓ How to read this Control Center</h2><div className="cc-explain-grid"><p><b>🟢 Green</b><br/>The available telemetry says this stage passed.</p><p><b>🟡 Yellow</b><br/>There is an operational or quality condition worth investigating.</p><p><b>⚪ White</b><br/>The required snapshot is missing. It is not treated as a pass.</p><p><b>🔒 Protected pipeline</b><br/>Control Center cannot lower thresholds, bypass evidence, bypass safety, rewrite/delete articles automatically, or auto-publish.</p></div></section>

    <footer className="cc-footer"><span>TrendForge V2 • Phase 25 Control Center</span><span>Historical runs: {runs.length} • Audit events: {auditEvents || '—'}</span></footer>
  </main>;
}
