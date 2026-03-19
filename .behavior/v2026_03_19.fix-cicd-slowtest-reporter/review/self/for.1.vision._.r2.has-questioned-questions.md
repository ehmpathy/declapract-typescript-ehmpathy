# self-review r2: has-questioned-questions

## triage of open questions from vision

reviewed the vision's "open questions & assumptions" section (lines 112-127).

---

## question 1: should we also add slowtest reporter to acceptance tests?

**can this be answered via logic now?**
yes — acceptance tests are inherently slow (end-to-end). a slowtest reporter would flag every test. that's noise, not signal.

**verdict:** [answered] — no, acceptance tests should not have the reporter.

**action:** updated vision to reflect this as a decided design choice, not an open question.

---

## question 2: is 10s the right threshold?

**can this be answered via logic now?**
partially — 10s is what rhachet-roles-ehmpathy uses. it's a reasonable default.

**should only the wisher know?**
yes — threshold is a policy decision. wisher may want a different default.

**verdict:** [wisher] — keep as question for wisher.

---

## question 3 (hidden): does "all tests" mean all projects or all test types?

**context:** found in r2 assumptions review.

**can this be answered via logic now?**
yes — the reference (rhachet-roles-ehmpathy) uses integration-only. the wisher said "like rhachet-roles-ehmpathy". this implies integration-only.

**verdict:** [answered] — "all tests" means "all projects get the reporter on their integration tests".

---

## questions triaged

| question | triage | rationale |
|----------|--------|-----------|
| acceptance tests? | [answered] | inherently slow, noise not signal |
| 10s threshold? | [wisher] | policy decision, wisher input needed |
| "all tests" scope? | [answered] | reference uses integration-only |

---

## action taken

updated the vision's open questions section to reflect the triage:
- removed acceptance tests question (answered: no)
- kept 10s threshold question (wisher input needed)
- clarified "all tests" interpretation
