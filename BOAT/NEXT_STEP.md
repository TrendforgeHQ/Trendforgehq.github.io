# BOAT Next Step

## Current task: validate Article Doctor on archived real articles
Risk: low. Provider cost: none. Production behavior change: none.

### Verified implementation
- Offline read-only evaluator: `scripts/boat-article-doctor.mjs`.
- Regression suite: `scripts/test-boat-article-doctor.mjs`.
- Report contract: `BOAT/schemas/article-doctor-report.schema.json`.
- Isolated workflow: `.github/workflows/boat-offline-tests.yml`.
- At commit `966b3311615e77def02699e6861d5020eee447bb`, isolated Node tests passed 10/10 (exit code 0). The matching GitHub Actions run was pending at last check.
- Draft PR #35: https://github.com/TrendforgeHQ/Trendforgehq.github.io/pull/35.

### Next implementation
1. Inspect the three archived article attempts (AD-FX-001..003) with the new structural diagnostics; record whether they produce expected findings or false positives. Do not change the source articles.
2. Add a real-world structural regression fixture only if a specific finding can be grounded in the saved Markdown.
3. Add malformed report / missing-claims and malformed frontmatter cases; preserve `unknown` for integrity problems.
4. Keep the report contract smoke test distinct from full JSON Schema validation; do not claim formal schema validation without a reviewed validator.
5. Record exact commit, command, exit code, Actions run ID, and unresolved issues before moving to the human-article benchmark lab.

### Separate Run 405 record
- PR #34 reliability run [38110223968](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110223968) passed a durable reconstructed baseline: 9 supported / 3 partial / 3 unsupported; verifier blocks as expected.
- Historical target 11/2/2 remains unverified because the original artifact expired and the committed archived evidence-pack file is empty. Do not call the reconstructed fixture an exact replay or change expected counts to force a match.

### Guardrails
- No paid providers, external source fetches, article edits, publishing workflow runs, image generation, or production gate changes for this phase.
- Do not change `main`; do not merge PR #34 or #35 without reviewing their exact diffs and required checks.
- Existing evidence, claim-verification, editorial, image-safety, and build gates remain authoritative.
- BOAT remains read-only. No repair, publish, merge, secret, or policy-threshold action is authorized.
