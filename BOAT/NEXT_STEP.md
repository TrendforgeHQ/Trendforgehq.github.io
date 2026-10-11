# BOAT Next Step

## Current task: harden artifact-integrity edge cases
Risk: low. Provider cost: none. Production behavior change: none.

### Verified implementation
- Offline read-only evaluator: `scripts/boat-article-doctor.mjs`.
- Regression suite: `scripts/test-boat-article-doctor.mjs`.
- Report contract: `BOAT/schemas/article-doctor-report.schema.json`.
- Isolated workflow: `.github/workflows/boat-offline-tests.yml`.
- Isolated Node tests at commit `dfa4f7e1090cf8df77cd48b4ff00e45a69e8b3a3`: 10/10 passed. GitHub Actions run [38110774506](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110774506) was still in progress at last check.
- Archived structural audit: AD-FX-001..003 produced no empty-heading/repeated-sentence false positives; this is only a three-article sample.
- Draft PR #35: https://github.com/TrendforgeHQ/Trendforgehq.github.io/pull/35.

### Next implementation
1. Add tests for malformed JSON reports, missing `claims`, missing article title/frontmatter, and mismatched article/report inputs; require `unknown` for integrity gaps rather than `clear`.
2. Keep clean, partial-only, blocked, and unknown status cases covered; ensure a medium structural finding yields `attention`, not a hard block.
3. Preserve the no-mutation guarantee and verify hashes before/after when running the CLI against a real archived fixture.
4. Review the latest GitHub Actions run and record its final result before further code changes.
5. Once these edge cases are stable, move toward source-to-claim evidence mapping and later human-article benchmarking. Do not jump to repair/autonomy yet.

### Separate Run 405 record
- PR #34 reliability run [38110223968](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110223968) passed a durable reconstructed baseline: 9 supported / 3 partial / 3 unsupported; verifier blocks as expected.
- Historical target 11/2/2 remains unverified because the original artifact expired and the committed archived evidence-pack file is empty. Do not call the reconstructed fixture an exact replay or change expected counts to force a match.

### Guardrails
- No paid providers, external source fetches, article edits, publishing workflow runs, image generation, or production gate changes for this phase.
- Do not change `main`; do not merge PR #34 or #35 without reviewing their exact diffs and required checks.
- Existing evidence, claim-verification, editorial, image-safety, and build gates remain authoritative.
- BOAT remains read-only. No repair, publish, merge, secret, or policy-threshold action is authorized.
