# BOAT Human Semantic-Support Review — v1

## Purpose and boundary

This rubric defines a **human-authored review record** for one proposed factual replacement against one exact article/report/evidence-pack bundle. It does not fetch sources, infer truth, approve publication, modify an article, or change the factual-proposal engine's safety state. A completed record preserves `semanticSupport: not_verified`, `approvalRequired: true`, and `automaticApplication: false`. Existing claim-verification, editorial-quality, image-safety, and publication gates remain mandatory.

## Required review sequence

1. **Freeze the subject.** Record workflow run/SHA, the exact article, claim-report and evidence-pack SHA-256 hashes, and proposal ID. If any hash is absent, malformed, or cannot be verified against the exact files, stop and do not complete a positive review.
2. **Read the exact claim and proposed replacement.** Identify every independently checkable factual component: who, what, when, where, quantities/units, causal language, attribution, and certainty.
3. **Read the exact cited passage in context.** Record the source URL, source ID, canonical passage ID, and exact passage text. A passage ID or matching URL alone is not support. If context is missing or passage identity is ambiguous, use `unclear`.
4. **Assess each component separately.** Choose `direct`, `partial`, `contradicted`, `absent`, or `ambiguous`; include a short quote when possible and explain the mapping. Do not treat an empty quote as evidence.
5. **Check scope, time, attribution, and uncertainty.** A source about a broader population, different date, different product/version, or another person's statement may not support the replacement as written. Preserve hedging and qualifications in the source.
6. **Choose the overall verdict.** Use the decision rules below; write a rationale that explains the strongest support and the most important gap.
7. **Record a recommendation, not an automatic action.** A reviewer may recommend sending a proposal to the existing gates, revising it, rejecting it, or requesting a second review. Nothing in this record applies the replacement or bypasses existing gates.

## Verdict rules

- **supported** — every factual component of the proposed replacement is directly supported by the cited passage in context; scope, timing and attribution align; no material qualification is dropped.
- **partially_supported** — at least one material component is supported, but another is only partial, missing, broader/narrower, or inadequately qualified. State exactly what would need to be removed or narrowed.
- **unsupported** — the passage contradicts the proposed replacement, or fails to support its material factual core. A citation's existence is not evidence of support.
- **unclear** — the passage is ambiguous, unavailable in sufficient context, identity is uncertain, or the reviewer cannot make a defensible determination. Do not resolve uncertainty by guessing.

Do not use `supported` merely because the replacement sounds plausible, matches a headline, or repeats the source's topic. For multiple factual components, all material components must pass for an overall `supported` verdict.

## Decision guidance

- `accept_for_existing_gates`: only a review recommendation; the proposal still needs all current automated and editorial gates.
- `revise_proposal`: specify the minimum factual wording change needed; do not invent substitute facts.
- `reject_proposal`: material contradiction or unsupported factual core.
- `needs_second_review`: specialist judgment, conflicting evidence, or unresolved ambiguity.

Record relevant risk flags: unsupported detail, overstated certainty, scope drift, date/quantity mismatch, attribution error, missing context, contradictory evidence, source quality concern, or other.

## Independence and disagreement

Identify the reviewer by a stable internal identifier and role. Disclose relevant conflicts or lack of independence. For consequential or disputed claims, prefer a second reviewer. Store disagreements as separate immutable review records; do not overwrite the first reviewer. The review-set policy treats repeated review IDs as blocking identity issues, excludes invalid or ID-colliding records from comparisons, distinguishes same-reviewer repeats from independent reviews, and reports differing verdicts from independent reviewers as requiring human resolution. It never majority-votes, averages, picks the latest, or selects a winner. Matching verdicts are descriptive agreement only. See [REVIEW_SET_POLICY.md](REVIEW_SET_POLICY.md). This contract does not define numeric confidence or automated adjudication.

## What this benchmark does not prove

A review record is an auditable human judgment, not an objective truth oracle. It does not prove source authenticity, guarantee reviewer correctness, or establish that the rest of an article is accurate. The schema checks structure and safety constants; it cannot semantically validate a reviewer's reasoning. No historical archived claim should be promoted based on this contract alone.
