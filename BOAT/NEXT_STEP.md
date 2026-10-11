# BOAT Next Step

## Current task: validate factual repair proposal engine
Risk: low. Provider cost: none. Production behavior change: none.

### Last verified baseline
- [BOAT Offline Tests run 38112229842](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38112229842): **34 passed, 0 failed, 0 skipped**.
- Four Evidence Auditor CLI tests covered valid same-run bundle, blocked lineage, missing hashes, and malformed JSON.

### New implementation in this commit; CI pending
- Added `scripts/boat-factual-repair-proposal.mjs`: generates a review artifact tied to the exact article, claim-report, evidence-pack hashes, workflow run, target claim, source ID, and canonical passage ID.
- Rejects missing/mismatched hashes, wrong source/passage lineage, unresolved passages, and claim text not found in the article.
- Output statuses are `review_required`, `blocked`, or `unknown`; it always sets `approvalRequired: true`, `automaticApplication: false`, and `semanticSupport: not_verified`.
- CLI writes a separate JSON report and refuses to overwrite input files or an existing output.
- Five new synthetic tests cover bundle binding, hash mismatch, source/passage mismatch, missing claim text, and CLI output safety.

### Validation to complete
1. Confirm this branch-head BOAT Offline Tests run passes; fix any failures before recording a pass.
2. Add a human-review checklist to the proposal report and validate it against the JSON schema.
3. Only after a proposed copy is reviewed may it be tested with existing claim verification and all required editorial/safety/build gates.
4. No real article is changed or published by this module.

### Guardrails
- No paid providers, external source fetches, image generation, site build, or publishing workflow runs.
- Do not change `main`; keep PR #35 draft/unmerged unless separately asked and review/checks are complete.
- Existing evidence, claim-verification, editorial, image-safety, and build gates remain authoritative.
