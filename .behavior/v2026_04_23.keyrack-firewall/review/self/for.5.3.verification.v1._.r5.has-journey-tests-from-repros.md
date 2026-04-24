# review.self: has-journey-tests-from-repros (r5)

## deeper reflection — should there be repros?

i claimed no repros because "no user-faced journeys." let me question that.

### what is a repro?

a repro sketches:
- a user's experience
- step by step
- with assertions at each step

### who is the user?

**direct users of declapract-typescript-ehmpathy:**
- developers who run `declapract plan` and `declapract fix`
- CI systems that run workflows

**indirect users:**
- humans who read workflow YAML
- humans who debug CI failures

### what journeys could have been sketched?

| journey | relevant? | why |
|---------|-----------|-----|
| developer runs declapract fix | yes | this is how templates apply |
| CI runs workflow with firewall | no | declapract doesn't control runtime |
| human reads workflow YAML | maybe | the YAML format changed |

### should there be a repro for "developer runs declapract fix"?

**old behavior**:
```
given: keyrack.yml declares ANTHROPIC_API_KEY
when: declapract fix runs
then: workflow YAML has secrets: ANTHROPIC_API_KEY block
```

**new behavior**:
```
given: template has firewall step
when: declapract fix runs
then: workflow YAML equals template
```

this journey changed. could have been a repro. was it tested?

### was the journey tested without repros?

yes. the test verifies:
```typescript
given('a workflow file with outdated content', () => {
  when('fix is applied', () => {
    then('it should return the template content', ...);
  });
});
```

this is the journey, as a test.

---

## found issues

**potential issue**: no repros artifact for a behavior change.

**assessment**: not a blocker because:
1. the journey is tested (fix returns template)
2. the PR is simplification, not addition
3. repros are most valuable for new user-faced features

**lesson**: even simplifications could benefit from repros to document the before/after experience.

## why it holds

### the journey exists in the test

the test structure is BDD:
```
given: a workflow file with outdated content
  when: fix is applied
    then: it should return the template content
```

this is a journey test, just not in a repros artifact.

### repros would have documented the experience shift

a repros artifact would have documented:
- old experience: secrets blocks appear in YAML
- new experience: firewall step appears in YAML

this documentation is valuable but not required for correctness.

### conclusion

no repros artifact, but the journey is tested. the absence is acceptable for a simplification PR. future PRs that change user experience should include repros.
