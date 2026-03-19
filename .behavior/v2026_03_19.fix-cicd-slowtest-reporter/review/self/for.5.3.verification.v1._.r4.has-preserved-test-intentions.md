# self-review r4: has-preserved-test-intentions

## the question

did i preserve test intentions? did i change what the test asserts, or did i only fix why it failed?

---

## tests touched

only one test file was modified:

| file | change type |
|------|-------------|
| .gitignore.declapract.test.ts | test input updated |

---

## analysis: .gitignore.declapract.test.ts

### what changed?

```diff
+.slowtest/integration.report.json
```

a single line was added to the test input fixture.

### what did this test verify before?

the test "should pass when all expected ignores are present" verifies that the check function passes when the gitignore file contains all required entries.

### does it still verify the same behavior after?

yes. the test still verifies the same behavior: "gitignore check passes when all expected ignores are present."

the only change was to the test input — the assertion remains identical:

```ts
expect(() => check(gitIgnore, {} as any)).not.toThrow();
```

### what type of change was this?

| change type | description | applies? |
|-------------|-------------|----------|
| weakened assertions | removed assertions or made them less strict | no |
| removed test cases | deleted tests that "no longer apply" | no |
| changed expected values | modified what we expect to match broken output | no |
| deleted failed tests | removed tests instead of fix code | no |
| **updated test input** | added new required entry to test fixture | **yes** |

the change was **input evolution**, not **weakened assertions**.

---

## why this holds

### the test intention is preserved

**before:** verify that check passes when gitignore has all required entries
**after:** verify that check passes when gitignore has all required entries

the intention is identical. the required entries list grew by one.

### the assertion logic is unchanged

```ts
// still the same assertion - not weakened
expect(() => check(gitIgnore, {} as any)).not.toThrow();
```

### all 7 test cases remain

| test case | before | after |
|-----------|--------|-------|
| should pass when all expected ignores are present | present | present |
| should fail when node_modules negation patterns are absent | present | present |
| should create file with all ignores | present | present |
| should add node_modules negations | present | present |
| should preserve custom ignores | present | present |
| should not duplicate negations | present | present |
| should move negations to the end | present | present |

no test cases removed. no test intentions altered.

---

## forbidden patterns check

| forbidden pattern | present? | evidence |
|-------------------|----------|----------|
| weaken assertions to make tests pass | no | assertion unchanged |
| remove test cases that "no longer apply" | no | all 7 tests remain |
| change expected values to match broken output | no | test passes with correct code |
| delete tests that fail instead of fix code | no | no tests deleted |

---

## conclusion

test intentions are preserved:
- only test input was updated (added new gitignore entry)
- no assertions were weakened
- no test cases were removed
- no expected values were changed to mask defects
- the test still verifies the same behavior it verified before

