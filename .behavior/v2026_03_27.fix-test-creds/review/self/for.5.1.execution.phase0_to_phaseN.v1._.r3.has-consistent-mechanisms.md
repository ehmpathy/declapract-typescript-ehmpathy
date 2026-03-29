# self-review r3: has-consistent-mechanisms

## deeper examination

### withKeyrackContext test utility

**what it is:** test utility in `src/.test/infra/withKeyrackContext.ts`

**what it replaced:** `src/.test/infra/withApikeysContext.ts` (deleted)

**why it was needed:**
- tests for buildWorkflowSecretsBlock and .test.yml.declapract.ts need to mock keyrack.get()
- withApikeysContext mocked the old readUseApikeysConfig utility
- withKeyrackContext mocks the new keyrack.get() SDK method

**is this duplicated elsewhere?** no. globbed `src/.test/infra/*` - only file in directory.

**verdict:** necessary replacement, not duplication

### key extraction logic duplication

reviewed in r2 - the ~15 lines of keyrack key extraction appear in:
1. `buildWorkflowSecretsBlock.ts` (lines 15-34)
2. `.test.yml.declapract.ts` (lines 11-28 in getKeyrackKeys)

**could I have reused buildWorkflowSecretsBlock in .test.yml.declapract.ts?**

examined output differences:
- buildWorkflowSecretsBlock: outputs `secrets:\n      KEY: ${{ secrets.KEY }}`
- buildExpectedContent: outputs secrets declaration block + env block (different format)

the transformations are fundamentally different. the shared part is only key retrieval.

**could I extract a shared getKeyrackKeys utility?**

yes, but:
1. blueprint did not specify this refactor
2. the duplication is minimal (~15 lines)
3. adding a new utility would increase file count
4. rule.prefer.wet-over-dry: wait for 3+ usages before extraction

**verdict:** holds. duplication is minimal and serves different output needs. extraction would be premature abstraction per wet-over-dry.

### other mechanisms checked

- searched `with.*Context` pattern: only withKeyrackContext found
- searched `build.*Block` pattern: only buildWorkflowSecretsBlock and buildExpectedContent found
- no other test utilities created

## final verdict

no new mechanisms duplicate functionality that should be reused. the only duplication (key retrieval) is minimal and intentional per wet-over-dry principle.
