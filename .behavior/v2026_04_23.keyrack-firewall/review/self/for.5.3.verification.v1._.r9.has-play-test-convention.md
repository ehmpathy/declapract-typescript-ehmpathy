# review.self: has-play-test-convention (r9)

## question: are journey test files named correctly?

### what tests exist in this PR?

| file | type | tests |
|------|------|-------|
| .test.yml.declapract.test.ts | unit | fix returns template |

### is this a journey test?

the guide says journey tests should use `.play.test.ts` suffix.

**definition**: a journey test walks through a user experience step by step.

**assessment**: `.test.yml.declapract.test.ts` is NOT a journey test. it tests a single function (fix) with a single assertion.

### does this PR need journey tests?

let me consider what journey would be tested:

```
given: project uses declapract-typescript-ehmpathy
when: developer runs declapract fix
then: workflow files are updated with firewall step
```

this journey is NOT tested as a `.play.test.ts` because:
1. declapract-typescript-ehmpathy is a practices repo, not an application
2. the "journey" is external (consumer projects run declapract)
3. the test verifies the fix function returns correct content

### is `.play.` convention applicable?

| criterion | applies? | why |
|-----------|----------|-----|
| user journey | no | no end-user interaction |
| multi-step flow | no | single function call |
| external integration | no | templates, not API calls |

---

## found issues

none.

## why it holds

### this is not a journey-test scenario

the PR changes templates and a fix function. there is no multi-step user journey to test.

the extant test verifies:
- fix function returns template content
- template content matches expectations

this is sufficient for a template/infrastructure PR.

### the `.play.` convention is for user journeys

examples where `.play.test.ts` applies:
- CLI command end-to-end tests
- API endpoint integration flows
- SDK method sequences

examples where it does NOT apply:
- unit tests of pure functions
- template content verification
- declapract fix function tests

### conclusion

no `.play.test.ts` files needed for this PR. the convention applies to user journey tests, which are not part of a template/practices repository change.

