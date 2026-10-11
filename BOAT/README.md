# BOAT — TrendForge Editorial Operations Bot

**Status:** Blueprint / Phase 0 documentation  
**Canonical state:** [PROJECT_STATE.md](PROJECT_STATE.md)  
**Blueprint:** [BLUEPRINT.md](BLUEPRINT.md)  
**Next action:** [NEXT_STEP.md](NEXT_STEP.md)

BOAT is a planned, controlled editorial operations agent for TrendForge. Its job is to help detect article-quality problems, audit published claims against evidence, learn from verified outcomes, prioritize urgent topics, and propose or perform explicitly authorized repairs without weakening the publishing safeguards.

BOAT is a project name, not a claim that autonomous execution already exists. As of this blueprint, no BOAT runtime, chat backend, permission button, or autonomous repair engine has been implemented.

## Non-negotiable principles

1. **Evidence before confidence:** factual claims must be checked against traceable sources; uncertainty must remain visible.
2. **Existing gates stay authoritative:** BOAT cannot bypass source verification, evidence integrity, claim verification, editorial quality, image safety, or build/release checks.
3. **Observe before acting:** begin read-only, establish baselines, and test proposed changes on fixtures or archived artifacts before production use.
4. **Human approval for consequential actions:** changes to code, published articles, workflow dispatch, credentials, thresholds, or publication state require explicit authorization and an auditable record.
5. **No hidden browser secrets:** the static Control Center must never contain privileged tokens or directly perform privileged server actions.
6. **Quota-aware by design:** prefer saved artifacts and deterministic fixtures; do not repeatedly call paid providers during diagnosis.
7. **Auditable memory:** decisions, hypotheses, evidence, changes, tests, commits, workflow runs, approvals, and outcomes must be recorded in repository Markdown/structured logs.
8. **Branch and PR workflow:** do not modify `main` directly; isolate changes and review before merge.
9. **Learn patterns, not prose:** human-written examples may inform editorial criteria, but BOAT must not copy protected wording or reproduce articles.
10. **Fail closed on uncertainty:** when evidence, permissions, identity, or validation is missing, stop and explain why.

## Planned capabilities

- Article Doctor: inspect articles and report claim/source, attribution, context, structure, repetition, and clarity issues.
- Evidence Auditor: map article claims to source passages and flag unsupported, stale, misattributed, or overconfident statements.
- Editorial Benchmark Lab: compare quality dimensions against selected human-written reference articles without copying their expression.
- Learning Engine: turn verified failures and outcomes into versioned, testable hypotheses; promote a learning only after regression evaluation and approval.
- Trend Prioritizer: rank urgent candidates and propose targeted work, with deduplication, quotas, and normal gates preserved.
- Permission Center: present exact proposed action, scope, diff, risks, tests, expiry, and approve/reject controls through a secure authenticated backend.
- Project Memory: maintain a chronological, queryable record with links to artifacts, PRs, commits, workflow runs, and decisions.

## Current implementation reality

The repository already contains a static-export Control Center, a Supervisor in `advisory-observational` mode, and a Self-Learning script in `shadow` mode. These are useful foundations, not a complete BOAT implementation. The publish workflow is scheduled every six hours and supports manual dispatch, but its current workflow declaration has no article/topic input for a targeted run. See [BASELINE_AUDIT.md](BASELINE_AUDIT.md).

## Document map

- [BLUEPRINT.md](BLUEPRINT.md) — architecture, flows, interfaces, and acceptance criteria.
- [PROJECT_STATE.md](PROJECT_STATE.md) — canonical state and verified progress.
- [ROADMAP.md](ROADMAP.md) — staged implementation plan.
- [DECISIONS.md](DECISIONS.md) — durable architecture and safety decisions.
- [CHANGELOG.md](CHANGELOG.md) — chronological work ledger.
- [LEARNINGS.md](LEARNINGS.md) — verified observations versus hypotheses.
- [PERMISSIONS.md](PERMISSIONS.md) — action classes and approval rules.
- [BASELINE_AUDIT.md](BASELINE_AUDIT.md) — initial repository inspection.
- [NEXT_STEP.md](NEXT_STEP.md) — one clearly defined next task.\n- `scripts/boat-article-doctor.mjs` — read-only article diagnostics.\n- `scripts/boat-evidence-auditor.mjs` — offline artifact/claim lineage audit.\n- `scripts/boat-repair-engine.mjs` — bounded structural repair proposal; never edits input files.

## Definition of done for Phase 0

The blueprint and project records are committed on a dedicated branch, linked from a PR, and reviewed for consistency. No runtime behavior or publishing policy is changed in this phase.
