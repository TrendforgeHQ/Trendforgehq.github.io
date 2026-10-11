# BOAT Next Step

## Current task: audit source-context coverage
Risk: low. Provider cost: none. Production behavior change: none.

### Verified implementation
- Offline read-only evaluator: `scripts/boat-article-doctor.mjs`.
- Report contract: `BOAT/schemas/article-doctor-report.schema.json`.
- Isolated regression workflow: `.github/workflows/boat-offline-tests.yml`.
- Latest CI [run 38110939177](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110939177) passed 14/14 at commit `d532a48b78cd25d687dd55b3f59a40713431dddf`.
- Findings now retain source URL/title, source ID/role, passage IDs, bounded excerpt, and the claim report JSON pointer when that information exists in the saved verifier report.
- PR #35 remains draft and unmerged: https://github.com/TrendforgeHQ/Trendforgehq.github.io/pull/35.

### Next implementation
1. Audit source-context coverage across AD-FX-001..003: count claim findings with a URL, source ID, passage IDs, or excerpt; report missing fields as missing, never infer them.
2. Add tests for a claim with no source metadata and a very long evidence excerpt; confirm null/empty defaults and the 500-character cap.
3. Keep the limitation explicit: these URLs and excerpts are copied from the saved verifier output; BOAT does not fetch or independently validate sources yet.
4. After source-context coverage is stable, build an offline Evidence Auditor summary with claim-to-source coverage and gaps. Do not call providers or change publication gates.
5. Human-article benchmarking comes after evidence audit; repairs, publishing, merges, and autonomy remain out of scope.

### Separate Run 405 record
- PR #34 reliability run [38110223968](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110223968) passed a durable reconstructed baseline: 9 supported / 3 partial / 3 unsupported; verifier blocks as expected.
- Historical target 11/2/2 remains unverified because the original artifact expired and the committed archived evidence-pack file is empty. Do not call the reconstructed fixture an exact replay or change expected counts to force a match.

### Guardrails
- No paid providers, external source fetches, article edits, publishing workflow runs, image generation, or production gate changes for this phase.
- Do not change `main`; do not merge PR #34 or #35 without reviewing their exact diffs and required checks.
- Existing evidence, claim-verification, editorial, image-safety, and build gates remain authoritative.
- BOAT remains read-only. No repair, publish, merge, secret, or policy-threshold action is authorized.
