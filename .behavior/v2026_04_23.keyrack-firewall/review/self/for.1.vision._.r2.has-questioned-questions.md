# review.self: has-questioned-questions (r2)

## triage of open questions from vision

### question 1: "which rhachet version has firewall?"

**can answer via logic?** no — version numbers are facts, not derivable

**can answer via extant docs/code?** yes — check rhachet package.json or changelog

**action**: answer now

**answer**: PR #344 was merged 2026-04-23. to verify version: check rhachet for version info.

since we're in declapract-typescript-ehmpathy, we can check what rhachet version we depend on and ensure it's recent enough.

**status**: [answered] — check package.json for rhachet version, ensure it's post-PR-#344

---

### question 2: "does firewall support all mechanisms?"

**can answer via logic?** partially — we know it supports EPHEMERAL_VIA_GITHUB_APP from acceptance tests

**can answer via extant docs/code?** yes — rhachet acceptance tests show mechanism support

**answer**: PR #344 acceptance tests show:
- safe keys (passthrough) ✅
- blocked patterns (ghp_*, AKIA*) ✅
- mechanism translation (JSON blob with `mech` field) ✅

**status**: [answered] — firewall supports the mechanisms we use

---

### question 3: "what about extant secrets blocks? do we remove them or keep for compat?"

**can answer via logic?** yes

**answer**:
- **caller workflows**: can keep `secrets:` blocks — harmless, firewall doesn't care
- **callee workflows**: remove generated env blocks — firewall replaces them
- **migration**: `declapract fix` will update callee workflows; callers may keep explicit secrets blocks for clarity (or switch to `secrets: inherit`)

**status**: [answered] — remove from callee, optional in caller

---

## updated "open questions" section for vision

based on triage, all questions are answered:

| question | status | answer |
|----------|--------|--------|
| rhachet version with firewall | [answered] | post-PR-#344, verify in package.json |
| mechanism support | [answered] | supports EPHEMERAL_VIA_GITHUB_APP per tests |
| extant secrets blocks | [answered] | remove from callee, optional in caller |

no questions require wisher input or external research.

## fix applied to vision

need to update vision's "open questions" section to reflect these answers.
