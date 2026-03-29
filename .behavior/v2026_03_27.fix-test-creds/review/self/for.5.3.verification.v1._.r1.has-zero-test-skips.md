# self-review r1: has-zero-test-skips

## the question

did I verify zero skips?
- no .skip() or .only() found?
- no silent credential bypasses?
- no prior failures carried forward?

---

## verification method

ran grep for forbidden patterns across all test files:

```
grep -r "\.skip\(|\.only\(" **/*.test.ts
```

result: no matches found

---

## check 1: no .skip() or .only()

**grep result**: 0 matches for `.skip(` or `.only(`

**why it holds**: no test is skipped. all tests execute on every run.

---

## check 2: no silent credential bypasses

**what to look for**: patterns like `if (!credentials) return` that silently skip tests

**files examined**:
- jest.integration.env.ts - uses keyrack.source() which throws on absent creds (no silent bypass)
- jest.acceptance.env.ts - same pattern

**why it holds**: keyrack.source({ mode: 'strict' }) throws an error if credentials are absent. there is no silent bypass.

---

## check 3: no prior failures carried forward

**test run result**: all tests pass

```
Test Suites: 2 passed, 2 total
Tests:       10 passed, 10 total
```

**why it holds**: no failures exist. there are no known-broken tests.

---

## why it holds

1. grep found zero .skip() or .only() patterns
2. keyrack.source() with mode: 'strict' prevents silent credential bypasses
3. all tests pass - no prior failures carried forward
4. zero skips verified
