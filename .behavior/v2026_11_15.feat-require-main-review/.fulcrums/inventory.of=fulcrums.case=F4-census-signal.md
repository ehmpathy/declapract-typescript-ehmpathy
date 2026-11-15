# F4: how does the census read a repo's review rule?

## .the fork
- read `/branches/main/protection` (definitive, admin only)
- read `reviewDecision` of recent prs plus the ruleset rules endpoint (push token)

## .taken
the push-token signals. the only token at hand (`ehm-seaturtle`) holds push, not admin; the
protection endpoint 404s for it.

rule: empty decision → lacks · REVIEW_REQUIRED → requires · APPROVED/CHANGES_REQUESTED →
ambiguous, read the next pr (up to 10) · none decisive → unknown.

proof:
- gated control: facebook/react, open prs read REVIEW_REQUIRED, merged read APPROVED
- ungated control: this repo, #764 (no review) reads empty; #761 reads APPROVED, so APPROVED alone proves naught

## .rework
clean: an admin token reruns the same skill, which reads the protection endpoint when the
viewer is ADMIN.

## .confidence
88%. the decision describes recent prs; a gate added since the latest pr would not show.

## .verdict
best-guessed.
