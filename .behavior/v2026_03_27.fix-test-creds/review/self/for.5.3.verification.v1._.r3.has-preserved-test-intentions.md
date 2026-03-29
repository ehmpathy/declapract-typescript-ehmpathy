# self-review r3: has-preserved-test-intentions

## the question

did test changes preserve intentions?
- did I change WHAT tests verify, or just HOW they set up?
- are all prior assertions still present?
- did I accidentally weaken any test?

---

## read each changed test file

### test.yml.declapract.test.ts

**what changed:**
```diff
- import { withApikeysContext } from '../../../../../__test_assets__/withApikeysContext';
+ import { withKeyrackContext } from '../../../../../__test_assets__/withKeyrackContext';

- await withApikeysContext({ apikeys: [] }, async () => {
+ await withKeyrackContext({ keys: [] }, async () => {

- await withApikeysContext({ apikeys: ['OPENAI_API_KEY', 'XAI_API_KEY'] }, async () => {
+ await withKeyrackContext({ keys: ['OPENAI_API_KEY', 'XAI_API_KEY'] }, async () => {
```

**what stayed the same:**
- `expect(result).toEqual(template)` — unchanged
- `expect(result).toContain('secrets:')` — unchanged
- `expect(result).toContain('OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}')` — unchanged
- `expect(result).toContain('XAI_API_KEY: ${{ secrets.XAI_API_KEY }}')` — unchanged

**analysis:**
- import changed: withApikeysContext -> withKeyrackContext
- fixture calls changed: `{ apikeys: [] }` -> `{ keys: [] }`
- all assertions unchanged
- the fixture changed HOW mocking works, not WHAT the test verifies

**verdict**: intentions preserved

---

### .test.yml.declapract.test.ts

**what changed:**
```diff
- import { withApikeysContext } from '../../../../../__test_assets__/withApikeysContext';
+ import { withKeyrackContext } from '../../../../../__test_assets__/withKeyrackContext';
```

same pattern as above. fixture changed, assertions unchanged.

**verdict**: intentions preserved

---

### bad-practice test files

these are new files, not changed files. new tests for new functionality (delete use.apikeys files).

**verdict**: n/a (new, not changed)

---

## meta-check

**question**: could I have weakened tests without realizing?

**answer**: no. I read the diff line by line. assertions are identical. only the mock mechanism changed (withApikeysContext -> withKeyrackContext).

**question**: does the new fixture test the same behavior?

**answer**: yes. withKeyrackContext mocks keyrack.get() to return the specified keys. this is the same pattern as withApikeysContext mocked readUseApikeysConfig(). the tests verify that buildWorkflowSecretsBlock() generates correct secrets blocks — that intention is unchanged.

---

## why it holds

1. read each changed test file
2. identified what changed (imports, fixture calls) vs what stayed (assertions)
3. confirmed assertions are identical before and after
4. understood that fixture change affects setup, not verification
5. test intentions are preserved

