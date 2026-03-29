# self-review r7: role-standards-coverage

## briefs categories for coverage

checked for absent patterns in these categories:

| category | question |
|----------|----------|
| `code.test/` | are changed procedures tested? |
| `code.prod/pitofsuccess.errors/` | are errors wrapped with context? |
| `code.prod/evolvable.domain.objects/` | are types well-defined? |
| `code.prod/readable.comments/` | are jsdocs present where needed? |

---

## coverage check: tests

### buildWorkflowSecretsBlock.ts

**question:** is this function tested?

**answer:** yes, covered in `test.yml.declapract.test.ts`:

```typescript
describe('test.yml.declapract buildWorkflowSecretsBlock', () => {
  given('the actual test.yml template', () => {
    when('no keyrack keys are required', () => {
      then('it should return template unchanged', async () => { ... });
    });
    when('one keyrack key is required', () => {
      then('it should add secrets block after with block', async () => { ... });
      then('it should match expected snapshot', async () => { ... });
    });
    when('multiple keyrack keys are required', () => {
      then('it should add all secrets to secrets block', async () => { ... });
      then('it should match expected snapshot', async () => { ... });
    });
  });
});
```

**coverage assessment:**
- empty keys: tested (returns unchanged)
- one key: tested (adds secrets block)
- multiple keys: tested (adds all secrets)
- snapshot tests: present for regression detection

**why it holds:** the function has 3 code paths (no keys, one key, multiple keys) and all are tested. snapshots catch unexpected output changes.

### bad-practice .declapract.ts files

**question:** are check and fix functions tested?

**answer:** yes, each has a test file:
- `use.apikeys.sh.declapract.test.ts`
- `use.apikeys.json.declapract.test.ts`

**coverage assessment:**
- check type verification: `expect(check).toEqual(FileCheckType.EXISTS)`
- fix behavior verification: `expect(result.contents).toBeNull()`

**why it holds:** both check and fix are tested. tests verify the contract (EXISTS check, null fix).

### withKeyrackContext test fixture

**question:** should the test fixture have tests?

**answer:** no, it's a test utility. tested indirectly through the tests that use it.

**why it holds:** test fixtures don't need their own tests. they're validated when their consumers pass.

---

## coverage check: error wraps

### buildWorkflowSecretsBlock.ts

**question:** should errors be wrapped with HelpfulError?

**answer:** no wrap needed here.

**analysis of error sources:**
1. `existsSync(keyrackYmlPath)`: returns false on error, no throw
2. `keyrack.get()`: rhachet sdk handles errors internally
3. `keys.map(...)`: pure transform, no expected errors
4. `input.template.replace(...)`: pure transform, no expected errors

**why it holds:** no external I/O that could fail unexpectedly. the keyrack sdk handles its own errors with actionable messages.

### jest.integration.env.ts

**question:** should keyrack.source() errors be wrapped?

**answer:** no.

**why:** keyrack.source() throws ConstraintError with exact fix commands. a wrap would obscure the helpful message. the purpose is fail-fast with guidance, not catch-and-wrap.

---

## coverage check: types

### buildWorkflowSecretsBlock.ts

**question:** are types well-defined?

**answer:** yes.

**type analysis:**
- `input: { template: string }`: explicit typed object
- `context: { getProjectRootDirectory: () => string }`: explicit typed dependency
- `Promise<string>`: explicit return type
- `KeyrackGrantAttempt[]`: imported type from rhachet

**why it holds:** all parameters and return values have explicit types. no `any`, no type inference for public surface.

### withKeyrackContext.ts

**question:** are types explicit?

**answer:** yes.

```typescript
export const withKeyrackContext = async (
  input: { keys: string[] },
  fn: (context: { getProjectRootDirectory: () => string }) => Promise<void>,
): Promise<void>
```

**why it holds:** input, callback, and return all typed. callback context matches what buildWorkflowSecretsBlock expects.

---

## coverage check: jsdocs

### withKeyrackContext.ts

**question:** does the test fixture have jsdoc?

**answer:** yes.

```typescript
/**
 * .what = creates a mock context with keyrack config in a temp directory
 * .why = enables test of buildWorkflowSecretsBlock with different keyrack configs
 */
```

**why it holds:** follows .what/.why format. explains purpose and rationale.

---

## absent patterns assessment

| file | pattern | present? | why |
|------|---------|----------|-----|
| buildWorkflowSecretsBlock.ts | unit tests | yes | in test.yml.declapract.test.ts |
| buildWorkflowSecretsBlock.ts | error wraps | n/a | no fallible I/O |
| buildWorkflowSecretsBlock.ts | explicit types | yes | all params typed |
| bad-practice files | unit tests | yes | dedicated test files |
| withKeyrackContext.ts | jsdoc | yes | .what/.why header |
| jest.*.env.ts | error wraps | n/a | keyrack handles errors |

---

## summary

reviewed all changed files for absent patterns:

1. **tests**: buildWorkflowSecretsBlock covered by test.yml.declapract.test.ts with 3 cases + snapshots. bad-practice files have dedicated test files.

2. **error wraps**: not needed. keyrack sdk handles errors with actionable messages. no other fallible I/O in changed code.

3. **types**: all explicit. no inference on public surface. KeyrackGrantAttempt imported from sdk.

4. **jsdocs**: present on all procedures and test fixtures.

no absent patterns found. coverage is complete.

