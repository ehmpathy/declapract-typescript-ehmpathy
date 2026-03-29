# self-review: has-pruned-yagni

## question

did we add anything beyond what was requested?

## findings

### non-issues (holds)

**withKeyrackContext test helper**
- created `src/.test/infra/withKeyrackContext.ts` to replace deleted `withApikeysContext.ts`
- required: tests that used withApikeysContext needed a replacement
- minimal: provides same functionality, adapted for keyrack API
- holds: this was necessary to maintain test functionality

**keyrack slug extraction logic**
- added `.note` comment explaining KeyrackGrantAttempt union type
- required: keyrack SDK returns different shapes based on status (granted/absent/locked/blocked)
- minimal: one line to extract key name from slug
- holds: this was necessary to work with the keyrack SDK API

### issues found and fixed

**package.json test command bug fix**
- fixed `&& test:validate` to `&& npm run test:validate`
- this was a prior bug in the repo's package.json (not best-practice template)
- technically out of scope for this behavior
- but: was blocking `npm run test` from completing
- decision: included in changes since it's a clear bug fix, not a feature addition

### deferred items (not YAGNI, just incomplete)

**prepare:rhachet step in .test.yml**
- blueprint section 5 specified: add `npm run prepare:rhachet --if-present` step to test-shards-integration and test-shards-acceptance jobs
- execution phases did not include this step
- not added during execution
- decision: flag as incomplete for next phase, not YAGNI

## verdict

no YAGNI violations found. all additions were either:
1. necessary replacements for deleted functionality
2. clear bug fixes unrelated to feature additions
3. explicitly requested in blueprint

the package.json bug fix was out of scope but was a blocking issue, not a feature addition.
