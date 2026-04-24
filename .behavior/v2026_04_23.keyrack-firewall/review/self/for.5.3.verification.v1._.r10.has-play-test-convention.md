# review.self: has-play-test-convention (r10)

## deeper reflection — is the test really not a journey?

i said "no journey test needed." let me question this.

### the extant test structure

`.test.yml.declapract.test.ts` uses BDD structure:

```typescript
given('a workflow file with outdated content', () => {
  when('fix is applied', () => {
    then('it should return the template content', async () => {
      // assertion
    });
  });
});
```

this IS journey-like syntax. is it a journey test?

### what makes a journey test?

| criterion | definition | does test meet? |
|-----------|------------|-----------------|
| multi-step user flow | walks through user experience | partially |
| documents experience | shows expected behavior | yes |
| end-to-end | tests full path | no |

### analysis

the test documents a developer journey:
1. **given**: workflow file with outdated content
2. **when**: fix is applied
3. **then**: template content is returned

but it is NOT end-to-end:
- does not invoke declapract CLI
- does not apply to real project
- does not verify CI execution

### should it be renamed to `.play.test.ts`?

**no.** here's why:

| aspect | `.play.test.ts` | `.declapract.test.ts` |
|--------|-----------------|----------------------|
| purpose | user journey tests | declapract file tests |
| scope | end-to-end | unit/function level |
| convention | general | repo-specific |

the `.declapract.test.ts` convention is established in this repo for tests that verify declapract file behavior (check/fix functions).

### is the repo convention correct?

let me verify other `.declapract.test.ts` files follow the same pattern.

searched: `**/*.declapract.test.ts`

these files test declapract fix/check functions, not user journeys. the convention is consistent.

---

## found issues

none.

## why it holds

### the test follows repo convention

`.declapract.test.ts` is the established pattern for tests that verify declapract file behavior. this is not the same as `.play.test.ts` which is for user-visible journeys.

### journeys span multiple systems

the true user journey is:
1. developer runs `declapract plan` (declapract CLI)
2. developer runs `declapract fix` (declapract CLI)
3. developer pushes (git)
4. CI runs with firewall (GitHub Actions)
5. secrets are exported (rhachet)

this journey cannot be tested in declapract-typescript-ehmpathy because it spans multiple systems (declapract CLI, consumer project, GitHub Actions, rhachet).

### what IS tested

the PR verifies:
- fix function returns correct content (unit test)
- template contains correct firewall step (template in git)
- caller workflows use secrets: inherit (template in git)

this is sufficient for a template/practices PR.

### conclusion

no `.play.test.ts` needed. the `.declapract.test.ts` convention is appropriate for this repo. the user journey spans multiple systems and cannot be tested here.

