# BOAT Review-Set Policy — v1

## Purpose

A review-set audit checks record identity and disagreement before anyone builds aggregate metrics. It is read-only: it never edits records, chooses a winning verdict, changes proposal state, or approves publication.

## Identity rules

- `reviewId` is globally unique within one review-set input. Any repeated ID is a blocking identity issue, even when the JSON records are byte-for-byte equivalent. Keep the original files unchanged and resolve the import/ID collision manually; do not silently deduplicate or overwrite.
- A record is structurally eligible for comparison only when it passes the semantic-support review validator.
- Review subject identity is the exact tuple of workflow run/SHA, article/report/evidence-pack hashes, proposal ID, claim index/text, proposed replacement, source ID, passage ID, source URL, and passage text. Different bundle hashes or a different proposed replacement must not be compared as the same subject.
- Reviewer identity is the stable `reviewerId` in the record. Multiple records from one reviewer do not count as independent reviewers.

## Disagreement rules

- For one exact subject, two or more structurally valid records from different reviewers with different verdicts produce `conflicting_independent_reviews`. Keep all records and all verdicts; do not majority-vote, average, pick the latest, or select the strongest verdict.
- Different verdicts from the same reviewer are reported as `same_reviewer_disagreement`, not independent confirmation.
- Matching verdicts from distinct reviewers may be reported as `independent_agreement`, but that is descriptive only; it does not establish objective truth or override existing gates.
- If review IDs collide, every record using that ID is excluded from subject comparison until a human resolves the identity problem. Do not choose one version as canonical.
- Invalid records are reported individually and excluded from comparison. They are never used to establish agreement or conflict.

## Safety and resolution

- The audit report is diagnostic, not a decision or approval.
- The tool does not modify source review records and does not write a canonicalized replacement set.
- Conflicts require a separately documented human resolution or additional independent review; original dissenting records remain preserved.
- Every review continues to carry `semanticSupport: not_verified`, `approvalRequired: true`, `automaticApplication: false`, and `existingGatesStillRequired: true`. Existing claim, editorial, image-safety, and publication gates remain mandatory.

## Explicit limitations

A matching verdict is not proof that a source is true or that reviewers are correct. This policy defines safe handling of duplicate identities and disagreement; it does not define a numeric score, automated adjudication, or a publication authorization path.
