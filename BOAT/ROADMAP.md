# BOAT Roadmap

Roadmap items are proposals until their implementation and verification are recorded in [PROJECT_STATE.md](PROJECT_STATE.md).

## Phase 0 — Foundation and baseline (current)
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
