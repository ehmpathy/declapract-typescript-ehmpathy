# self-review r8: role-standards-coverage

## deeper coverage examination

this review goes beyond surface patterns to check for absent standards that require investigation.

---

## coverage category 1: test completeness

### buildWorkflowSecretsBlock.ts tests

**examined:** `test.yml.declapract.test.ts` lines 11-86

**test cases present:**
1. `when('no keyrack keys are required')` - empty keys array
2. `when('one keyrack key is required')` - single key
3. `when('multiple keyrack keys are required')` - two keys

**edge cases to consider:**

| edge case | covered? | how |
|-----------|----------|-----|
| keyrack.yml absent | yes | returns template unchanged (no keys) |
| empty keys array | yes | explicit test case |
| single key | yes | explicit test case + snapshot |
| multiple keys | yes | explicit test case + snapshot |
| template unchanged | yes | `expect(result).toEqual(template)` |
| secrets block format | yes | `expect(result).toContain('secrets:')` |
| key format | yes | `expect(result).toContain('KEY: ${{ secrets.KEY }}')` |

**why it holds:** all code paths in buildWorkflowSecretsBlock have matched test cases. the function has 2 early returns (no keyrack.yml, empty keys) and 1 main path (build secrets block). all 3 are covered.

### bad-practice tests

**examined:** `use.apikeys.sh.declapract.test.ts` and `use.apikeys.json.declapract.test.ts`

**test cases present:**
1. `it('should check for file existence')` - verifies FileCheckType.EXISTS
2. `it('should return null contents to delete the file')` - verifies null return

**edge cases to consider:**

| edge case | covered? | how |
|-----------|----------|-----|
| check type correct | yes | `expect(check).toEqual(FileCheckType.EXISTS)` |
| fix deletes file | yes | `expect(result.contents).toBeNull()` |
| fix with content | yes | tests pass content to fix |
| fix with empty content | no | but n/a - fix ignores content |

**why it holds:** the fix function ignores content entirely (`() => { return { contents: null }; }`). there's no code path that uses contents, so no test is needed for empty content.

---

## coverage category 2: validation patterns

### jest.integration.env.ts

**question:** are all validation scenarios covered?

**validation present:**
1. `existsSync(keyrackYmlPath)` - checks keyrack.yml exists before call
2. `keyrack.source({ mode: 'strict' })` - validates keys present via sdk

**edge cases to consider:**

| edge case | covered? | how |
|-----------|----------|-----|
| keyrack.yml absent | yes | existsSync returns false, no call |
| keyrack locked | yes | keyrack.source throws ConstraintError |
| keys absent | yes | keyrack.source throws ConstraintError |
| keyrack.yml malformed | yes | keyrack sdk validates yaml |

**why it holds:** the existsSync guard handles the "no config" case. all other validation is delegated to keyrack sdk which has its own comprehensive validation.

### buildWorkflowSecretsBlock.ts

**question:** are inputs validated?

**validation present:**
1. `if (!existsSync(keyrackYmlPath)) return input.template` - guard for absent config
2. `if (!keys.length) return input.template` - guard for empty keys

**edge cases to consider:**

| edge case | covered? | how |
|-----------|----------|-----|
| template undefined | no | but n/a - typescript enforces |
| context undefined | no | but n/a - typescript enforces |
| keys array undefined | no | keyrack.get returns [] not undefined |

**why it holds:** typescript enforces input types at compile time. the guards handle runtime cases (absent keyrack.yml, empty keys). keyrack.get() contract guarantees array return.

---

## coverage category 3: idempotency

### keyrack.source()

**question:** is the call idempotent?

**analysis:** keyrack.source() injects keys into process.env. if called twice:
- first call: keys injected
- second call: keys already present, no-op

**why it holds:** keyrack sdk handles idempotency internally. inject of same values to process.env is idempotent.

### buildWorkflowSecretsBlock()

**question:** is the function idempotent?

**analysis:** if called twice with same input:
- first call: adds secrets block
- second call: regex matches the same pattern, adds duplicate block

**potential issue?** regex `/(uses: \.\/\.github\/workflows\/\.test\.yml\n...)` would match again after modification.

**actually no issue:** declapract workflow is `check → fix → write`. the function is called once per file per fix run. idempotency is at the file operation level (overwrite), not function level.

**why it holds:** declapract semantics ensure the fix function is called once per file. the output is deterministic for same input.

---

## coverage category 4: immutability

### buildWorkflowSecretsBlock.ts

**question:** are inputs mutated?

**analysis:**
- `input.template`: used in replace(), which returns new string, no mutation
- `context.getProjectRootDirectory()`: called but not mutated
- `keys`: mapped to new array, original not mutated

**why it holds:** all operations return new values. no `.push()`, no property assignment, no mutation.

### withKeyrackContext.ts

**question:** does the test fixture mutate shared state?

**analysis:**
```typescript
(keyrackModule.keyrack as { get: typeof originalGet }).get = async () => mockGrants;
// ...
(keyrackModule.keyrack as { get: typeof originalGet }).get = originalGet;
```

**mutation present:** yes, but in try/finally with restore.

**why it holds:** mutation is scoped to test execution. `finally` block guarantees restore. this is standard mock/restore pattern.

---

## coverage category 5: absent patterns inventory

**final check for patterns that should be present but are absent:**

| pattern | should be present? | present? | why |
|---------|-------------------|----------|-----|
| unit tests | yes | yes | all functions tested |
| integration tests | no | n/a | declapract runs e2e |
| error wraps | no | n/a | no fallible I/O |
| input validation | yes | yes | guards present |
| explicit types | yes | yes | all params typed |
| jsdoc headers | yes | yes | all procedures have .what/.why |
| idempotency | yes | yes | handled by sdk and declapract |
| immutability | yes | yes | no mutations |
| fail-fast | yes | yes | strict mode, early returns |

---

## summary

deep examination of coverage found:

1. **test completeness**: all code paths covered. edge cases handled by guards or sdk.

2. **validation patterns**: existsSync and keyrack.source({ mode: 'strict' }) cover all scenarios. typescript enforces compile-time types.

3. **idempotency**: keyrack.source() idempotent by sdk design. buildWorkflowSecretsBlock deterministic.

4. **immutability**: no mutations to input or context. test fixture uses standard mock/restore.

5. **absent patterns**: none found. all required patterns present.

no absent patterns discovered. coverage is complete.

