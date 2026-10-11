# BOAT Next Step

## Current task: broaden read-only Article Doctor coverage
Risk: low. Provider cost: none. Production behavior change: none.

### Verified completed work
- Read-only evaluator: `scripts/boat-article-doctor.mjs`.
- Regression suite: `scripts/test-boat-article-doctor.mjs`.
- Report contract: `BOAT/schemas/article-doctor-report.schema.json`.
- Isolated workflow: `.github/workflows/boat-offline-tests.yml`.
- CI run [38110482104](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110482104) passed 7/7 tests at commit `c52a129cb8fc11350e6fabcd8ce38953aeb2a19f`.
- PR #35 remains draft and unmerged: https://github.com/TrendforgeHQ/Trendforgehq.github.io/pull/35.

### Next implementation
1. Add a clean verifier-report fixture and a partial-only fixture so BOAT proves it can distinguish `clear`, `attention`, `blocked`, and `unknown` without false-clean results.
2. Add deterministic read-only Markdown checks for empty headings and repeated sentences, with fixtures and precise artifact pointers. These are diagnostics only; they must not change publication behavior.
3. Keep unsupported/contradicted/attribution/numeric signals separate and preserve the rule that missing or mismatched artifacts produce `unknown`, not `clear`.
4. Add a formal JSON Schema validation step only if it can be done with a reviewed, pinned dependency; until then, describe current coverage as a schema-contract smoke test.
5. Record test command, exit code, run ID, commit SHA, and all unresolved gaps in `PROJECT_STATE.md` and `CHANGELOG.md`.

### Separate Run 405 record
- PR #34 reliability run [38110223968](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110223968) passed a durable reconstructed baseline: 9 supported / 3 partial / 3 unsupported; verifier blocks as expected.
- Historical target 11/2/2 remains unverified because the original artifact expired and the committed archived evidence-pack file is empty. Do not call the reconstructed fixture an exact replay or change expected counts to force a match.

### Guardrails
- No paid providers, external source fetches, article edits, publishing workflow runs, image generation, or production gate changes for this phase.
- Do not change `main`; do not merge PR #34 or #35 without reviewing their exact diffs and required checks.
- Existing evidence, claim-verification, editorial, image-safety, and build gates remain authoritative.
- BOAT remains read-only. No repair, publish, merge, secret, or policy-threshold action is authorized.
