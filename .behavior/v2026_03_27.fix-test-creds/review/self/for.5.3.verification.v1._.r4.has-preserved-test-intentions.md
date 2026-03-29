# self-review r4: has-preserved-test-intentions

## the question

for every test I touched:
- what did this test verify before?
- does it still verify the same behavior after?
- did I change what the test asserts, or fix why it failed?

---

## read each test file I changed

### test.yml.declapract.test.ts

**before:**
```typescript
import { withApikeysContext } from '../../../../../__test_assets__/withApikeysContext';

await withApikeysContext({ apikeys: [] }, async () => { ... });
await withApikeysContext({ apikeys: ['OPENAI_API_KEY', 'XAI_API_KEY'] }, async () => { ... });
```

**after:**
```typescript
import { withKeyrackContext } from '../../../../../__test_assets__/withKeyrackContext';

await withKeyrackContext({ keys: [] }, async () => { ... });
await withKeyrackContext({ keys: ['OPENAI_API_KEY', 'XAI_API_KEY'] }, async () => { ... });
```

**what did the test verify before?**
- buildWorkflowSecretsBlock() returns template unchanged when no keys are required
- buildWorkflowSecretsBlock() adds secrets block when keys are required

**does it still verify the same behavior after?**
yes. the assertions are identical:
- `expect(result).toEqual(template)` — unchanged
- `expect(result).toContain('secrets:')` — unchanged
- `expect(result).toContain('OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}')` — unchanged

**did I change what the test asserts?**
no. I changed HOW the mock is configured (withApikeysContext -> withKeyrackContext), not WHAT the test verifies.

---

### .test.yml.declapract.test.ts

same pattern. fixture changed, assertions unchanged.

---

### bad-practice test files (new)

these are new tests, not changed tests. they verify:
- check = FileCheckType.EXISTS
- fix returns { contents: null }

no prior test intentions to preserve.

---

## forbidden patterns checklist

| forbidden pattern | did I do this? |
|-------------------|----------------|
| weaken assertions to make tests pass | no |
| remove test cases that "no longer apply" | no |
| change expected values to match broken output | no |
| delete tests that fail instead of fix code | no |

---

## meta-check: did I deceive myself?

**question:** could I have tricked myself about preserved intentions?

**answer:** let me look at the raw diff again.

the assertions in test files are:
- `expect(result).toEqual(template)` — same
- `expect(result).toContain('secrets:')` — same
- `expect(result).toContain('OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}')` — same
- `expect(result).toContain('XAI_API_KEY: ${{ secrets.XAI_API_KEY }}')` — same
- `expect(result).toMatchSnapshot()` — same

none of these changed. only the import and fixture setup changed.

---

## why it holds

1. read each changed test file line by line
2. identified the exact changes: imports and fixture calls
3. verified assertions are byte-for-byte identical
4. confirmed no forbidden patterns
5. test intentions are preserved — only mock mechanism changed

