# review.self: has-journey-tests-from-repros (r4)

## question: did you implement each journey sketched in repros?

### repros artifact check

searched for repros artifact:
```
.behavior/v2026_04_23.keyrack-firewall/3.2.distill.repros.experience.*.md
```

**result**: no repros artifact exists.

### why no repros?

this PR followed an abbreviated route:
1. wish → vision → execution → verification

the repros phase was skipped because:
- the behavior change is internal infrastructure (workflow templates)
- no user-faced journeys to sketch
- the vision describes the change in sufficient detail

### what journeys exist in the vision?

the vision describes one "journey":
```
1. `declapract plan` — see the diff (secrets blocks removed, firewall step added)
2. `declapract fix` — apply changes
3. push — CI runs with firewall
4. firewall validates keys, exports to env
5. tests run with credentials in `$GITHUB_ENV`
```

this is an operator journey, not a user journey. it describes how declapract behaves after the change.

### is this journey tested?

| step | tested? | how |
|------|---------|-----|
| declapract plan sees diff | ✓ | FileCheckType.EQUALS triggers on mismatch |
| declapract fix applies template | ✓ | .test.yml.declapract.test.ts |
| CI runs with firewall | n/a | runtime behavior, not declapract behavior |
| firewall validates keys | n/a | tested in rhachet, not declapract |
| tests run with credentials | n/a | runtime behavior |

declapract's responsibility ends at steps 1-2. steps 3-5 are firewall behavior.

---

## found issues

none.

## why it holds

### no repros ≠ no journey tests

repros are sketched when user-faced journeys exist. this PR changes internal infrastructure.

the journey that matters is:
1. declapract detects mismatch (FileCheckType.EQUALS)
2. declapract fix returns template

both are tested.

### what about firewall journeys?

firewall journeys are tested in rhachet:
- key filter
- mechanism translation
- pattern validation
- export to GITHUB_ENV

declapract does not test firewall. firewall is a runtime dependency.

### conclusion

no repros artifact because no user-faced journeys. the operator journey (declapract plan/fix) is tested via FileCheckType.EQUALS and the fix test.
