# BOAT — Recovered Historical Evidence-Pack Audit

Date: 2026-10-11  
Mode: offline/read-only recovery audit  
Provider calls: none  
Publishing/site build: none  
Article edits: none

## Executive result

The three previously archived claim-blocked attempts do have recoverable authoritative evidence packs. The packs are not inside the *claim-blocked* directories themselves. The same-run generated-pending-verification sibling directories are also present in the repository, and the original GitHub Actions artifacts independently confirm those files were included in each run. Each sibling contains authoritative-evidence-pack.json and metadata.

The pipeline's Archive generated article attempts step copies the canonical pack into that generated-attempt directory. Later, Claim verification gate creates a separate claim-blocked directory and copies the article, brief, claim report, and metadata—but not the evidence pack. The Upload article attempt diagnostics step uploads data/article-attempts/, so the earlier generated-attempt directory preserves the pack inside the run artifact. The root data/authoritative-evidence-pack.json is not explicitly listed in the upload step, but the copy in data/article-attempts/ is.

## Recovered run inventory

| Workflow run | Artifact ID | Artifact name | Expiry | Recovered pack SHA-256 |
|---|---:|---|---|---|
| [38085367295](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38085367295) | 11682276860 | trendforge-article-attempt-492 | 2026-10-24 | 47c1f027ac234b6d6e7b9ac1b88ef8925556ef5d1548a8360d1f9ac0b4712212 |
| [37996683799](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/37996683799) | 11647766077 | trendforge-article-attempt-488 | 2026-10-23 | 12dbb5ca51f529be124922d5b4b6e31df3ee3cc072ae066eaae7025572ac9737 |
| [37696062759](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/37696062759) | 11515936671 | trendforge-article-attempt-478 | 2026-10-21 | 21b598353008e2d6f6a9dbcd3d82c5f12f1dfd90fcb19a8670b1a6d77e04292d |

These hashes were computed from the recovered pack bytes during this audit. They were **not recorded by the original workflow at generation time**.

## Per-run checks

### Run 38085367295 — Anthropic / Philadelphia false tip

- Generated-attempt directory: article-attempts/20261010-205544-anthropic-ai-model-submits-false-murder-tip-to-philadelphia-police/
- Claim-blocked directory: article-attempts/20261010-205638-anthropic-ai-model-submits-false-murder-tip-to-philadelphia-police-claim-blocked/
- Exact article-brief title selected one candidate: “Rogue Anthropic AI agent gave police fake tip in unsolved murder case - BBC”
- Claim report source IDs and URLs matched selected pack sources: **4/4**
- Claims: **15**; exact claim strings present in the final quarantined article: **15/15**
- Legacy/noncanonical bestPassageId values: **13/15** claims. Conservative exact-text resolver found **12/15** unique canonical passage matches; 3 remain unresolved, 0 ambiguous. Original IDs are preserved; no automatic conversion.
- Generated and blocked metadata share workflow run 38085367295 and SHA 181d8e5181f2e79da77f496898a33fe27ccef092.
- Generated metadata's articlePath matches the claim report's articlePath.

Other recovered-byte hashes:
- Brief: 73f3b37542b4ffd71fb11b51f8a3e7d1487ea47f48d4f329b7235bfc6120aa51
- Claim report: 6a1ff969f7bb9f759fe1339056b22d8c90f450eb40abadec7d42eb13a54bd53d
- Final quarantined article: 698ff0a086da0e643648c0532b5778a2e4d4ec4d0bee43204fb5e01db3f360a2

### Run 37996683799 — AI coding agents / software shipments

- Generated-attempt directory: article-attempts/20261009-220306-ai-generated-code-blooms-but-software-shipments-stay-flat/
- Claim-blocked directory: article-attempts/20261009-220410-ai-generated-code-blooms-but-software-shipments-stay-flat-claim-blocked/
- Exact article-brief title selected one candidate: “AI coding agents generate more code, but not more software”
- Claim report source IDs and URLs matched selected pack sources: **4/4**
- Claims: **18**; exact claim strings present in the final quarantined article: **18/18**
- Legacy/noncanonical bestPassageId values: **17/18** claims. Conservative exact-text resolver found **12/18** unique canonical passage matches; 6 remain unresolved, 0 ambiguous. Original IDs are preserved; no automatic conversion.
- Generated and blocked metadata share workflow run 37996683799 and SHA 1d260ec59446b0710a646d405ff3eea5a195973d.
- Generated metadata's articlePath matches the claim report's articlePath.

Other recovered-byte hashes:
- Brief: 1bf927ca75ec76e1935ae96c6bfa52ac62263399dbf7d14ad89756026701f49f
- Claim report: efd4e556d37e07c7e95060804e338b3ac82c1d62fdde853640463b5d02b6e7a2
- Final quarantined article: e22836233230d025650b43eff660371e400fc7c11c9263c4a9525fc9202d59ee

### Run 37696062759 — 10x Research / Bitcoin forecast

- Generated-attempt directory: article-attempts/20261007-223019-10x-research-bitcoin-bottom-forecast-missed-what-the-numbers-reveal/
- Claim-blocked directory: article-attempts/20261007-223044-10x-research-bitcoin-bottom-forecast-missed-what-the-numbers-reveal-claim-blocked/
- Exact article-brief title selected one candidate: “10x Research Forecast Bitcoin Could Fall to $46,000, but What Really Happened? - Yahoo Finance”
- Claim report source IDs and URLs matched selected pack sources: **2/2**
- Claims: **7**; exact claim strings present in the final quarantined article: **4/7**
- **Important warning:** three saved claim strings do not appear exactly in the final quarantined article. Pack recovery is successful, but claim-report-to-final-article binding is only partial; do not use this run for claim-specific repair proposals without further reconciliation.
- Legacy/noncanonical bestPassageId values: **6/7** claims. Conservative exact-text resolver found **4/7** unique canonical passage matches; 3 remain unresolved, 0 ambiguous. Original IDs are preserved; no automatic conversion.
- Generated and blocked metadata share workflow run 37696062759 and SHA 6608297eb504f57b9483749247e8bd239b0d6de8.
- Generated metadata's articlePath matches the claim report's articlePath.

Other recovered-byte hashes:
- Brief: 638b0a2a29c5077bb806d5877a10f6bb30ee6bd735a8de82f4faf8bfcbe7b0b8
- Claim report: e084512259651ded2234c6a0f4d62ba72e01f3ce51393d69cbe9130f49623fba
- Final quarantined article: 16a82b473c596e7856f6b28732d4e73d533a21879092619d4bfa4902cfc6b05c

## Findings and limits

1. **Pack recovery: 3/3.** Each pack was read from its exact generated-attempt sibling in the repository and independently confirmed in the corresponding original workflow artifact; none was reconstructed from an article brief.
2. **Candidate mapping: 3/3.** Each saved article-brief.json title exactly matched one and only one candidate title in its same-run canonical evidence-pack envelope.
3. **Source mapping: 10/10.** All report source IDs/URLs matched the selected candidate's sources for these three runs.
4. **Run metadata: 3/3.** Generated-attempt and blocked metadata agree on run ID and workflow SHA; generated metadata's article path matches the claim report's article path.
5. **Claim/report binding: 2 complete, 1 partial.** The 10x Research run has only 4/7 exact claim strings present in the final article.
6. **Passage mapping is partial, not assumed.** The exact-text resolver uniquely matched 28/40 claim passages across these runs (12/15, 12/18, 4/7); 12 remain unresolved and 0 were ambiguous in this sample. It only reports canonical IDs when the saved bestPassage matches exactly one passage from that claim's source, optionally after collapsing an identical repeated sentence. It never rewrites the original report. This is a mapping aid, not proof of semantic support.
7. **Hashes are recovery-time checksums, not original generation-time hashes.** They protect the recovered bundle from accidental later changes, but do not retroactively prove what bytes were hashed by the original pipeline.
8. **No factual claim is upgraded to supported by this audit.** Matching artifact lineage is not semantic support.

## Pipeline retention root cause

In .github/workflows/publish.yml:
- Archive generated article attempts copies data/authoritative-evidence-pack.json into the generated-pending-verification directory before claim verification.
- Claim verification gate creates a separate -claim-blocked directory but copies only article, brief, claim-verification report, and conditionally grounding-repair diagnostics. It omits authoritative-evidence-pack.json.
- Upload article attempt diagnostics uploads data/article-attempts/ and several root diagnostics, with retention-days: 14. Because the earlier generated-attempt folder is within data/article-attempts/, the pack is still recoverable from the run artifact.

## Next safe step

- Extend the recovery audit's regression fixtures with these observed pack-envelope and metadata shapes. A real-fixture integration test now reads all three checked-in article/report/brief/pack combinations.
- Next, build a separate proposal-input adapter that consumes this recovery audit and allows only uniquely mapped passages; unresolved claims remain blocked/unknown. Preserve the human review checklist and do not apply any proposal automatically.
- Add the recovered run/artifact ID and computed checksums to project memory.
- Keep the PR draft and unmerged. Do not change main, call providers, run publishing, or apply article repairs.


## Passage resolver validation
- The exact-text resolver returns a suggestion only when the saved bestPassage uniquely matches a passage in the same source's canonical pack. It can collapse a sequence only when every sentence is an identical duplicate.
- Regression coverage includes unique exact match, repeated duplicate text, ambiguous duplicate source passages, no-match behavior, and all three real archived attempts.
- Latest branch-head run [38115430698](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38115430698): **57 passed, 0 failed, 0 skipped**.
- Original claim reports and articles remain unchanged; semantic support is still not verified.

## Recovered proposal-input adapter

Added `scripts/boat-recovered-proposal-input.mjs` as a separate offline step after recovery audit. It verifies that current article/report/brief/pack bytes match the recovery-time checksums, selects exactly one authoritative pack candidate by the saved brief title, and rechecks source IDs/URLs. A per-claim input is eligible only when the saved claim text occurs in the final quarantined article and the recovery resolver has one exact canonical passage from that same source.

- Unmatched or ambiguous passages remain `unknown`; claims absent from the article and source-lineage mismatches are `blocked`.
- The adapter emits source/passage inputs only. It does not author replacement text, does not apply edits, and does not pass recovery-time hashes off as original generation-time hashes.
- Every output retains `approvalRequired: true`, `automaticApplication: false`, and `semanticSupport: not_verified`.
- Synthetic tests and integration tests against all three archived attempts were added. Expected eligible counts are 12, 12, and 4 respectively; these are test expectations, not a verified result. Branch-head CI validation is pending.
