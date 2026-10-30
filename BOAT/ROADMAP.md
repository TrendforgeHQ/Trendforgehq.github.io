# BOAT Roadmap

Roadmap items are proposals until their implementation and verification are recorded in [PROJECT_STATE.md](PROJECT_STATE.md).

## Phase 0 — Foundation and baseline (documented; PR review pending)
- [x] Inspect repository metadata and existing Control Center/Supervisor/Self-Learning/publish workflow.
- [x] Record current architecture limits and safety constraints.
- [ ] Review and merge the documentation PR.
- [ ] Map exact input/output contracts and file paths for memory, evidence packs, claim verification, editorial checks, published articles, and audit trail.
- [ ] Create a repeatable read-only baseline report from existing saved artifacts without paid provider calls.

**Exit gate:** blueprint approved; interfaces and data provenance documented; no production behavior changed.

## Phase 1 — Read-only BOAT core
- Build a deterministic artifact collector and normalized article/run model.
- Build an Article Doctor report-only command.
- Add fixture cases for known article issues and missing/malformed artifacts.
- Emit structured findings and Markdown summaries.
- Record source refs, article revision, run/commit provenance, and confidence.
- Keep all results advisory; no writes to articles or publication decisions.

**Exit gate:** deterministic tests pass; missing evidence never passes silently; no provider call is required for core fixtures.

## Phase 2 — Claim audit and editorial benchmark
- Build a claim-to-source matrix using existing evidence and verification outputs.
- Verify exact artifact identity with hashes and workflow-run metadata before trusting lineage.
- Support statuses for supported, contradicted, insufficient, stale, misattributed, and uncertain.
- Add human-written reference rubric and provenance tracking.
- Compare dimensions such as accuracy, depth, context, attribution, specificity, clarity, and reader value.
- Store lessons as testable editorial patterns; never copy article prose.
- Measure agreement against manually reviewed examples.

**Exit gate:** benchmark results are reproducible and distinguish observed scores from subjective judgments.

## Phase 3 — Repair sandbox and regression harness
- Propose minimal repairs in isolated copies/branches.
- Initial allowed repair scope: empty headings and exact duplicate plain-text paragraphs; write only to a new output path.
- Re-run Article Doctor after structural proposals; factual changes must additionally pass existing claim verification and all relevant editorial/safety/build checks.
- Add regressions for known unit/scale errors, unsupported facts, misleading certainty, empty headings, repetition, and attribution drift.
- Keep failed repairs blocked and report the remaining problem.
- Never remove unsupported claims merely to make a gate pass; factual repairs require authoritative evidence and re-verification.
- No automatic production article edits.

**Exit gate:** every accepted repair passes required validators and retains a traceable before/after diff.

## Phase 4 — Secure permissions and Control Center
- Decide on authenticated backend/GitHub App/protected workflow gateway based on available infrastructure.
- Design approval objects bound to immutable proposal hashes.
- Implement approve, reject, and request-changes flows with actor/time/scope audit logs.
- Expose status in Control Center without embedding credentials or privileged tokens in static browser code.
- Require renewed approval if the diff changes.

**Exit gate:** auth, authorization, expired/replayed approval, changed-diff, and secret-leak tests pass.

## Phase 5 — Urgent topics and bounded targeted workflows
- Implement a deduplicated priority queue and urgency score.
- Add article/topic-specific dispatch only after workflow inputs, permissions, concurrency, and quota caps are tested.
- Preserve normal six-hour scheduled runs.
- Prevent duplicate candidate dispatch and uncontrolled expensive provider/image calls.
- Keep all existing gates mandatory.

**Exit gate:** fixture-driven dispatch tests demonstrate dedupe, quota enforcement, cancellation, and fail-closed behavior.

## Phase 6 — Limited autonomy
- Start with low-risk, reversible, explicitly scoped actions.
- Require an approved policy, kill switch, maximum action budget, and monitoring.
- Run a limited canary period and compare precision, missed issues, false positives, cost, and repair regressions.
- Expand autonomy only after measured reliability and human review.
- No automatic gate weakening, secret changes, code merge, or unreviewed public release.

**Exit gate:** documented metrics meet thresholds agreed before the canary; rollback and audit are verified.

## Dependency order
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6.

A phase may be split into smaller PRs. Avoid combining UI, backend, publishing workflow, and autonomous actions into one change.

## Product-first realignment — 2026-10-11

The roadmap must be judged against the original product goal, not the number of schemas or tests completed. The safety/lineage work is foundation, not the product itself. Keep it, but stop expanding contract-only tooling unless it unblocks a concrete end-user capability.

### North-star acceptance criteria
- A protected Control Center is the user's home for BOAT: live status, an actual conversation interface, task history, findings, proposals, approvals, and learning records.
- The user can instruct BOAT in natural language; BOAT explains what it understood, what it will inspect, what it found, and what action it proposes.
- BOAT audits the full published-article catalogue, including claim-by-claim evidence, source URLs/passages, freshness, attribution, uncertainty, and structural/editorial problems. Missing artifacts must be shown as unknown, never silently treated as passed.
- BOAT can research the public web and review selected external articles for quality/approach comparisons, preserving source links and dates and learning editorial patterns rather than copying expression.
- BOAT suggests specific fixes with evidence, risk, exact diff, tests, cost, and rollback; consequential actions require authenticated approval bound to the exact proposal.
- Learning is an evidence-backed loop: incident → root-cause hypothesis → regression fixture → offline/historical evaluation → measured outcome → approval before promotion. No silent policy/gate weakening.
- Every task, source, finding, proposal, approval, execution, test, and result is recorded and visible in Control Center and project memory.

### Revised delivery order
1. **Vertical slice first:** inspect the existing `app/control-center/page.tsx` and static-data model; design the real BOAT task/chat API boundary and threat model. Deliver a truthful Control Center task/chat experience with task history and read-only audit results before adding more standalone validators.
2. **Published catalogue audit:** inventory every published article; establish coverage; create a deterministic report for article → claims → evidence pack → source/passages → freshness/editorial findings. Add resumable batches and a clear unknown/blocked state.
3. **Web research + editorial benchmark:** add controlled public-web retrieval with source/date provenance and a comparison report for selected human-written/competitor articles; do not copy prose.
4. **Proposal and permission centre:** render ranked fixes, exact diffs, expected impact, risk, test plan, cost, and rollback; secure approval and action records.
5. **Controlled execution:** apply approved changes only on isolated branches/sandboxes, run existing verification/editorial/image/build gates, open a PR, and show the result in chat.
6. **Learning and improvement:** turn verified failures/outcomes into testable experiments, compare before/after metrics, keep unapproved changes in shadow mode, and promote only through review.
7. **Targeted topic workflows and bounded autonomy:** only after the above loop works end-to-end; retain dedupe, quota ceilings, kill switch, and all existing gates.

### Immediate next task
Do a Control Center interface and backend-contract audit, identify the smallest useful end-to-end read-only vertical slice, then implement it in a dedicated PR with tests. Do not spend the next step on another isolated schema unless the slice depends on it. Keep the current safety rules and do not touch `main`.
