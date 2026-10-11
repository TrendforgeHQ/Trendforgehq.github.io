# BOAT Next Step

## Current task: verify the new audit + sandbox repair loop
Risk: low. Provider cost: none. Production behavior change: none.

### Implemented in this iteration
- `scripts/boat-evidence-auditor.mjs`: offline claim/source/passage lineage checks.
- `scripts/boat-repair-engine.mjs`: bounded structural repair proposals written only to a separate output path.
- `scripts/test-boat-evidence-repair.mjs`: synthetic lineage, hash/run mismatch, conflicting source, and repair-isolation regressions.
- `BOAT/schemas/evidence-audit-report.schema.json`: report contract.
- `.github/workflows/boat-offline-tests.yml`: runs all BOAT offline tests; no provider, image, site build, or publishing call.

### Repair boundary
1. BOAT may remove empty Markdown headings and exact duplicate plain-text paragraphs outside frontmatter, code blocks, lists, and Sources/References sections.
2. Repair Engine refuses in-place edits and refuses to overwrite an existing output file.
3. It does not rewrite factual claims, citations, source lists, headings with text, metadata, or publication gates.
4. Every candidate output must be re-audited; a green structural check is not proof of factual accuracy.
5. Unsupported/contradicted claims remain diagnosis-only until an evidence-backed repair proposal can be validated and the existing verifier passes. No fabricated facts or gate weakening.

### Lineage contract
- The auditor requires metadata hashes for the exact raw claim report and evidence pack, plus a workflow run ID. Missing hash/run metadata returns `unknown`.
- It checks source IDs, URLs, roles, duplicate/conflicting source metadata, matched passage IDs, and canonical best-passage IDs where possible.
- Legacy/non-canonical IDs are reported as unmapped rather than guessed. Matching IDs do not prove semantic support or factual truth.
- Synthetic fixtures are used because the archived blocked attempts do not currently provide a verified same-run evidence-pack/hash bundle. Do not claim the archived attempts passed this new auditor until that bundle exists.

### Validation result and next task
- **CI PASS:** [run 38111515276](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38111515276), code commit `7c422befd7f7bc5064d4e1774220a6763151f62a`: **30 passed, 0 failed, 0 skipped**. This run tested the implementation commit before the subsequent docs-only formatting correction.
- Next: add a CLI-level test for the Evidence Auditor and a synthetic same-run artifact bundle; do not claim any legacy archive is auditable until exact pack/report hashes are available.
- Then design factual repair proposals that preserve evidence and re-run existing claim verification. Keep unsupported/contradicted claims blocked when no evidence-backed repair exists.
- Keep PR #35 draft/unmerged; no changes to `main`, publishing workflow, provider routing, or production gates.

### Guardrails
- No paid providers, external source fetches, image generation, site build, or publishing workflow runs.
- Do not change `main`; do not merge PR #34 or #35 without reviewing exact diffs and required checks.
- Existing evidence, claim-verification, editorial, image-safety, and build gates remain authoritative.
