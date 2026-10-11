# BOAT Next Step

## Current task: offline Evidence Auditor — lineage consistency
Risk: low. Provider cost: none. Production behavior change: none.

### Verified implementation
- Offline read-only Article Doctor: `scripts/boat-article-doctor.mjs`.
- Report contract: `BOAT/schemas/article-doctor-report.schema.json`.
- Isolated regression workflow: `.github/workflows/boat-offline-tests.yml`.
- Latest CI [run 38111102258](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38111102258) passed 17/17 at commit `aab68b728f443d9ea9fa4892657e7f61fc42fcae`.
- Source context and report-level coverage are preserved from saved verifier artifacts. The report clearly distinguishes metadata presence from actual source verification.
- PR #35 remains draft and unmerged: https://github.com/TrendforgeHQ/Trendforgehq.github.io/pull/35.

### Next implementation
1. Add a separate offline Evidence Auditor module that accepts an article claim report and the exact saved authoritative evidence pack from the same workflow attempt.
2. Cross-check each claim's `sourceId`, `matchedPassages` / `bestPassageId`, source URL, and role against the pack's source IDs and passage IDs. Report mismatches, missing IDs, and stale/mismatched artifact lineage.
3. Treat missing or mismatched pack inputs as `unknown`; do not treat matching IDs as proof that a claim is true or the passage semantically supports it.
4. Add synthetic fixtures for valid lineage, missing source ID, missing passage ID, wrong workflow/run, and duplicate/conflicting source metadata. Keep all tests offline.
5. After lineage checks pass, separately design source relevance/support review; do not fetch the web or call paid providers in this phase.

### Separate Run 405 record
- PR #34 reliability run [38110223968](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110223968) passed a durable reconstructed baseline: 9 supported / 3 partial / 3 unsupported; verifier blocks as expected.
- Historical target 11/2/2 remains unverified because the original artifact expired and the committed archived evidence-pack file is empty. Do not call the reconstructed fixture an exact replay or change expected counts to force a match.

### Guardrails
- No paid providers, external source fetches, article edits, publishing workflow runs, image generation, or production gate changes for this phase.
- Do not change `main`; do not merge PR #34 or #35 without reviewing their exact diffs and required checks.
- Existing evidence, claim-verification, editorial, image-safety, and build gates remain authoritative.
- BOAT remains read-only. No repair, publish, merge, secret, or policy-threshold action is authorized.
