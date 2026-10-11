# BOAT Next Step

## Current task: validate factual repair proposals
Risk: low. Provider cost: none. Production behavior change: none.

### Verified immediately before this task
- [BOAT offline run 38112229842](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38112229842): **34 passed, 0 failed, 0 skipped**.
- Four CLI integration tests passed: same-run/hash-bound bundle returns exit 0; blocked lineage returns exit 1; missing hashes returns unknown/2; malformed JSON returns 2 without emitting a report.

### Added in the current iteration; CI pending
- `scripts/boat-factual-repair-proposal.mjs`: creates a factual-repair proposal bound to exact article, claim-report, evidence-pack hashes and workflow run metadata.
- Requires proposal source ID to match the target claim source, resolves canonical passage ID against the evidence pack, and checks the claim text is present in the original article.
- Output is `review_required`, `blocked`, or `unknown`; it always sets `approvalRequired: true`, `automaticApplication: false`, and `semanticSupport: not_verified`.
- CLI writes a separate JSON report and refuses to overwrite input files or an existing output.
- Synthetic tests cover matching bundle, hash mismatch, source/passage mismatch, missing claim text, output safety, and article immutability.

### Validation to complete
1. Confirm the current BOAT Offline Tests run passes and record the exact commit/run.
2. If any test fails, fix the module/test and rerun before proceeding.
3. After a pass, add an explicit human-review checklist to the proposal report and test report-schema contract.
4. Do not apply a factual proposal to a real article until existing claim-verification and all required editorial/safety/build gates have been run on the proposed copy.

### Guardrails
- No paid providers, external source fetches, image generation, site build, or publishing workflow runs.
- Do not change `main`; keep PR #35 draft/unmerged unless separately asked and all checks/review are complete.
- Existing evidence, claim-verification, editorial, image-safety, and build gates remain authoritative.
