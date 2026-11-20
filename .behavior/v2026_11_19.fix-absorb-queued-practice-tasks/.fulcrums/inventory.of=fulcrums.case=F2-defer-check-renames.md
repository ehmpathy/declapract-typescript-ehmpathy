# F2 — the check renames (#791, #801) wait one release, behind the F1 gate

## .the fork
- a: rename `test-acceptance-locally` → `test-acceptance-on-local-on-prod` now, as #801 asks ("upstream immediately, no exceptions")
- b: ship the F1 gate now; rename in the next release, once every adopter's protection requires the gate rather than the job name

## .taken
b. a rename of a required job in the same release as the gate strands every adopter's first upgrade pr (#781, read on ahbode/svc-images#16: 19 green, `BLOCKED`). the gate must reach protection first, via one post-merge `github / apply`; then the rename costs no adopter a manual edit.

## .rework
clean. the rename is a job-id edit in `.test.yml` plus its callers; it can land in this pr if the wisher prefers, at the cost #781 measured.

## .confidence — 85%
the commander asked for the suffix "immediately". this defers it by one release on a stat; the wisher may still choose a.

## .where
issues #791, #801 (left open, reason posted)

## .verdict
— (awaits review)
