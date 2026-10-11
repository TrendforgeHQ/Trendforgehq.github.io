# BOAT Next Step

## Current task: validate the Evidence Auditor CLI end-to-end
Risk: low. Provider cost: none. Production behavior change: none.

### Implemented
- Offline Article Doctor and Evidence Auditor.
- Structural Repair Engine that writes proposals to a separate file and refuses in-place edits/overwrites.
- Synthetic source/passage/hash/run mismatch tests and protected-region repair tests.
- Added CLI integration regressions that create a same-run report/evidence-pack/metadata bundle in a temporary directory and exercise process exit codes:
  - `clear` → exit 0
  - `blocked` → exit 1
  - `unknown` or malformed input → exit 2
- These new CLI tests are committed but their CI run is pending; do not claim them passed until Actions confirms it.

### Validation result and next task
- Previous baseline: [run 38111661629](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38111661629), 30 passed, 0 failed, 0 skipped before these CLI-level additions.
- Current task: verify the new branch-head Actions run; fix failures before recording a pass.
- After a pass, next implementation is an evidence-backed factual repair proposal contract: input claim + exact source passage + proposed replacement + rationale + before/after hashes; no automatic application. Candidate must be rerun through existing claim verification and Article Doctor. If evidence is missing or contradictory, no replacement is proposed.
- Archived blocked attempts still cannot be called valid same-run audit cases without an exact evidence-pack/report hash bundle.

### Repair and lineage boundaries
1. Structural repairs only remove empty headings and exact duplicate plain-text paragraphs outside frontmatter, code blocks, lists, and Sources/References.
2. Repair output must use a new path; never overwrite or edit the original input.
3. Factual repair is proposal-only and requires authoritative evidence plus mandatory existing verifiers.
4. Missing/mismatched hashes or workflow-run metadata returns `unknown`. Identifier matching does not establish factual truth or semantic support.

### Guardrails
- No paid providers, external source fetches, image generation, site build, or publishing workflow runs.
- Do not change `main`; keep PR #35 draft/unmerged unless separately asked and all checks/review are complete.
- Existing evidence, claim-verification, editorial, image-safety, and build gates remain authoritative.
