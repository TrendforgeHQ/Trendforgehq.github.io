# BOAT Next Step

## Current task: validate factual repair proposal engine
Risk: low. Provider cost: none. Production behavior change: none.

### Last verified baseline
- [BOAT Offline Tests run 38112229842](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38112229842): **34 passed, 0 failed, 0 skipped**.
- Four Evidence Auditor CLI tests covered valid same-run bundle, blocked lineage, missing hashes, and malformed JSON.

### Verified implementation
- [BOAT Offline Tests run 38112644061](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38112644061): **39 passed, 0 failed, 0 skipped** at commit `b9a7d4ff3c4f87aaa224d87b0bd1d3e26a3a6cbb`.

### Verified review checklist
- [BOAT Offline Tests run 38112722176](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38112722176): **39 passed, 0 failed, 0 skipped** at commit `c1f55308bab89c186ac5910037da379b6e0adf87`.
- The proposal report now includes six review items covering semantic support, changed facts/qualifiers, names/dates/numbers/scope/attribution, source suitability, existing verifier/editorial results, and recorded reviewer decision.

### Next task: validate real pipeline artifact adapters without running providers
- Added `scripts/boat-factual-repair-proposal.mjs`: generates a review artifact tied to the exact article, claim-report, evidence-pack hashes, workflow run, target claim, source ID, and canonical passage ID.
- Rejects missing/mismatched hashes, wrong source/passage lineage, unresolved passages, and claim text not found in the article.
- Output statuses are `review_required`, `blocked`, or `unknown`; it always sets `approvalRequired: true`, `automaticApplication: false`, and `semanticSupport: not_verified`.
- CLI writes a separate JSON report and refuses to overwrite input files or an existing output.
- Five new synthetic tests cover bundle binding, hash mismatch, source/passage mismatch, missing claim text, and CLI output safety.

### Validation to complete
1. Confirm this branch-head BOAT Offline Tests run passes; fix any failures before recording a pass.
1. Build a read-only adapter that maps actual saved pipeline artifact shapes into the proposal inputs; use checked-in or downloaded historical artifacts only, with no provider run.
2. Add a schema-contract test for the review checklist and statuses.
3. Only after a proposed copy is reviewed may it be tested with existing claim verification and all required editorial/safety/build gates.
4. No real article is changed or published by this module.

### Guardrails
- No paid providers, external source fetches, image generation, site build, or publishing workflow runs.
- Do not change `main`; keep PR #35 draft/unmerged unless separately asked and review/checks are complete.
- Existing evidence, claim-verification, editorial, image-safety, and build gates remain authoritative.
