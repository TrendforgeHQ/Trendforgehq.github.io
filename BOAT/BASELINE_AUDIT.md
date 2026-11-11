# BOAT Baseline Audit

**Audit date:** 2026-10-11  
**Scope:** Initial read-only inspection of the GitHub repository and selected source files. This is not a full repository or article-by-article audit.

## Repository facts
- Repository: `TrendforgeHQ/Trendforgehq.github.io`
- Default branch: `main`
- Control Center route: `app/control-center/page.tsx`
- Control Center QA workflow: `.github/workflows/control-center-qa.yml`
- Publishing workflow: `.github/workflows/publish.yml`
- Existing Supervisor: `scripts/trendforge-supervisor.mjs`
- Existing Self-Learning: `scripts/trendforge-self-learning.mjs`
- Existing memory and audit components include `scripts/trendforge-memory.mjs`, `scripts/trendforge-audit-trail.mjs`, `data/trendforge-memory.json`, and `data/decision-log.jsonl`.

## Findings

### B-001 — Control Center is static
The inspected page declares static export behavior and reads repository data snapshots at build time. A real conversational backend or privileged approval executor is not present in this page. Any future action gateway must be designed separately.

### B-002 — Supervisor is advisory-observational
The inspected script labels its mode `advisory-observational` and writes policy fields declaring that it does not influence decisions or change publication, evidence, claim, or safety gates. It emits metrics, bottlenecks, and recommendations.

### B-003 — Self-Learning is shadow and primarily aggregate-based
The inspected script reads historical memory runs/topics, aggregates decision/evidence/claim/provider metrics, and emits learning signals in `shadow` mode. This does not, by itself, implement claim-by-claim source validation or human-article editorial benchmarking.

### B-004 — Publishing cadence and targeted dispatch
The inspected workflow runs on `0 */6 * * *` and supports `workflow_dispatch` with no inputs in the current declaration. Targeted urgent work needs an explicit design and tests; the current workflow should not be described as already supporting article-specific dispatch.

### B-005 — Existing gates must remain intact
The inspected workflow includes source verification, evidence preflight, pre-writer evidence checks, claim verification, bounded repair/re-verification, and later editorial/safety/build steps. BOAT must reuse these protections and never introduce a bypass.

### B-006 — Existing repository already has open PRs
At the time of inspection, unrelated PRs were open (including provider handling and workflow/artifact fixes). BOAT should use a dedicated documentation branch and avoid unrelated edits or merge actions.

## Scope limitations
- This pass did not independently verify every published article or every claim.
- It did not run the repository build or CI.
- It did not inspect all workflows, every script, deployment permissions, branch rules, or backend options.
- It did not test the live site's behavior in a browser.
- No claim is made that all existing system behavior is covered by these selected files.

## Next audit targets
1. Trace data schemas and producers/consumers for article files, evidence packs, claim verification, editorial reports, and published article indexes.
2. Inspect audit-trail and memory tests for their current coverage and failure behavior.
3. Identify deterministic saved artifacts suitable for a no-provider baseline.
4. Record a small manually verified set of article/source issues to serve as a regression fixture set.


## Phase 0.2 — Read-only interface map (2026-10-11)

| Artifact | Producer | Consumer | Provenance / known gap |
|---|---|---|---|
| `content/articles/*.md` | `scripts/generate-article-adaptive.mjs`; synchronized by `scripts/sync-articles.ts` | Editorial intelligence, quality, image/SEO/build | Frontmatter and Sources URLs; no guaranteed per-claim immutable ID. |
| `data/scored-trends.json`, `data/decision-queue.json` | Trend scoring / `scripts/trend-decision-engine.mjs` | Adaptive writer and pre-writer selection | Candidate ranking is not proof of article claim accuracy. |
| `data/source-verification.json` | `scripts/verify-trend-sources.mjs` and link recovery | Evidence integrity preflight | Reachability/count alone is insufficient; relevance and final URL matter. |
| `data/evidence-integrity.json` | `scripts/evidence-integrity-preflight.mjs` | Adaptive writer and pre-writer gate | Mutable run snapshot; diagnostic should record workflow run/SHA. |
| `data/article-brief.json` | `scripts/pre-writer-pipeline.mjs` | Writer, verifier, repair, editorial stages | Must be tied to the exact article/run; stale mismatch should be an integrity finding. |
| `data/authoritative-evidence-pack.json` | `buildAuthoritativeEvidencePack` in `scripts/authoritative-evidence-pack.mjs` | Writer, verifier, repair evidence guard | Includes source IDs, URLs, publisher family, roles, lineage, passages and coverage; root file is mutable. |
| `data/claim-verification.json` | `scripts/verify-article-claims-v2.mjs` | Claim gate, repair, diagnostics | Includes claim statuses and evidence/attribution/numeric signals; root snapshot is overwritten. |
| `data/grounding-repair.json` | `scripts/repair-article-grounding.mjs` | Re-verification and diagnostics | Pair with before/after article and claim reports; counters alone do not prove repair validity. |
| `data/editorial-scores.json`, `data/editorial-review-queue.json` | `scripts/editorial-intelligence.mjs` | Control Center and editorial review | Rubric scores are not factual verification or a human-vs-BOAT benchmark by themselves. |
| `data/editorial-gate.json` | Workflow editorial gate (exact producer still to trace) | Quality/publication | Keep distinct from the article score collection; lineage remains open. |
| `data/image-manifest.json`, `data/image-policy.json` | Image generation and asset validation | Image safety, sync/build | Image safety is a separate gate from factual accuracy. |
| `data/trendforge-memory.json`, `data/trendforge-learning.json` | Memory and self-learning scripts | Supervisor and Control Center | Primarily bounded run aggregates and shadow signals, not a full immutable claim-level event ledger. |
| `data/trendforge-supervisor.json`, `data/trendforge-audit-trail.json` | Supervisor and audit-trail scripts | Control Center / audit | Recommendations are advisory; existing audit is not a complete immutable approval log. |
| `data/article-attempts/*-claim-blocked/` | Claim gate in `.github/workflows/publish.yml` | Diagnosis and regression fixtures | Saved article/report/metadata often include run and SHA. Sample is biased toward blocked attempts. |

### Verified archived failure seeds
- **AD-FX-001 — Attribution/certainty:** Anthropic false-tip article, run `38085367295`; claim report has `pass=false`, 15 claims, one unsupported claim, and a blocked attribution-uncertainty signal. [Saved report](https://github.com/TrendforgeHQ/Trendforgehq.github.io/blob/main/data/article-attempts/20261010-205638-anthropic-ai-model-submits-false-murder-tip-to-philadelphia-police-claim-blocked/claim-verification.json).
- **AD-FX-002 — Unsupported inference:** AI-generated-code article, run `37996683799`; `pass=false`, 18 claims, one unsupported and four partial claims. [Saved report](https://github.com/TrendforgeHQ/Trendforgehq.github.io/blob/main/data/article-attempts/20261009-220410-ai-generated-code-blooms-but-software-shipments-stay-flat-claim-blocked/claim-verification.json).
- **AD-FX-003 — Numeric synthesis / temporal context:** Bitcoin forecast article, run `37696062759`; `pass=false`, seven claims, one unsupported and three partial claims; a scope warning includes “never”. [Saved report](https://github.com/TrendforgeHQ/Trendforgehq.github.io/blob/main/data/article-attempts/20261007-223044-10x-research-bitcoin-bottom-forecast-missed-what-the-numbers-reveal-claim-blocked/claim-verification.json).

These are real saved reports indexed for later tests, **not yet replayed** by BOAT. No fix or root cause is claimed from these examples alone.
