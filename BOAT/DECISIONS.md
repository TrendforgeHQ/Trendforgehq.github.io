# BOAT Decision Log

This is the durable record of decisions. Amendments must append a dated entry rather than silently rewriting history.

## D-001 — Keep BOAT separate from existing publishing gates
- **Date:** 2026-10-11
- **Decision:** BOAT may inspect, diagnose, propose, and coordinate work, but existing source/evidence/claim/editorial/image-safety/build gates remain authoritative.
- **Reason:** A self-improving agent must not be able to remove the checks that determine whether its output is safe and accurate.
- **Status:** Accepted as a project constraint.

## D-002 — Read-only first
- **Date:** 2026-10-11
- **Decision:** Start with artifact inspection and reporting before repairs or workflow execution.
- **Reason:** Establish a baseline and verify interfaces without risking published content or consuming provider quota.
- **Status:** Accepted.

## D-003 — Static Control Center is not a privileged action backend
- **Date:** 2026-10-11
- **Decision:** Do not implement approval buttons that execute privileged actions directly from static browser code. Use a secure authenticated server-side gateway/protected workflow for real actions.
- **Reason:** Static client code cannot safely hold secrets, and approvals must be authenticated and auditable.
- **Status:** Accepted; backend choice remains open.

## D-004 — Keep urgent-topic runs bounded
- **Date:** 2026-10-11
- **Decision:** Explore candidate-specific dispatch with deduplication, quota limits, and concurrency control; keep the six-hour schedule as fallback.
- **Reason:** Urgency matters, but unbounded manual runs can waste provider/image quota and duplicate work.
- **Status:** Accepted direction; implementation details pending.

## D-005 — Human article comparisons learn editorial patterns, not wording
- **Date:** 2026-10-11
- **Decision:** Benchmark measurable editorial dimensions and learn general techniques without copying protected prose or article expression.
- **Reason:** Improve quality while preserving originality and provenance.
- **Status:** Accepted.

## D-006 — All material work must be recorded
- **Date:** 2026-10-11
- **Decision:** Maintain project state, roadmap, decision log, changelog, learnings, permission policy, baseline audit, and next-step file in GitHub.
- **Reason:** Work must resume accurately across chats and be auditable.
- **Status:** Accepted.

## D-007 — No direct main-branch changes
- **Date:** 2026-10-11
- **Decision:** Use an isolated branch and PR; do not auto-merge.
- **Reason:** Preserve reviewability and avoid disturbing existing work.
- **Status:** Accepted.
