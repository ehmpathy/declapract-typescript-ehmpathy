# self-review r2: has-acceptance-test-citations

## the question

cite the acceptance test for each playtest step.

---

## deeper investigation: exact test citations

### playtest.1 step 2: check = FileCheckType.EXISTS

**file**: `src/practices/cicd-common/bad-practices/old-use-apikeys/.agent/repo=.this/role=any/skills/use.apikeys.sh.declapract.test.ts`

**test case (lines 6-8)**:
```typescript
it('should check for file existence', () => {
  expect(check).toEqual(FileCheckType.EXISTS);
});
```

**what it proves**: the check export equals FileCheckType.EXISTS

---

### playtest.1 step 3: fix returns { contents: null }

**file**: `src/practices/cicd-common/bad-practices/old-use-apikeys/.agent/repo=.this/role=any/skills/use.apikeys.sh.declapract.test.ts`

**test case (lines 10-13)**:
```typescript
it('should return null contents to delete the file', async () => {
  const result = await fix('#!/bin/sh\n# content', {} as any);
  expect(result.contents).toBeNull();
});
```

**what it proves**: fix() returns { contents: null } which tells declapract to delete the file

---

### same tests for .json file

**file**: `src/practices/cicd-common/bad-practices/old-use-apikeys/.agent/repo=.this/role=any/skills/use.apikeys.json.declapract.test.ts`

**test cases**:
- lines 6-8: "should check for file existence"
- lines 10-13: "should return null contents to delete the file"

---

## steps without automated test coverage

| playtest step | why no automated test? |
|---------------|------------------------|
| playtest.1 step 1 (4 files exist) | structural — git tracks it |
| playtest.2 steps 1-3 (keyrack.source) | template content — CONTAINS check |
| playtest.3 (tests pass) | meta — tests test the tests |
| playtest.4 (files absent) | structural — git tracks it |

---

## are these gaps?

### playtest.2: jest env files

**question**: should we add tests for jest env file content?

**answer**: no.

- jest env files are templates
- declapract CONTAINS check verifies templates match
- unit tests would duplicate CONTAINS check
- the playtest verifies content via grep

### playtest.4: files absent

**question**: should we add tests that verify files don't exist?

**answer**: no.

- file absence is structural
- git tracks what files exist
- the playtest verifies via ls

---

## why it holds

1. cited exact test files and line numbers for check/fix logic
2. both .sh and .json have identical test coverage
3. steps without automated tests are either:
   - structural (git tracks)
   - templates (CONTAINS check handles)
   - meta (tests pass = all tests run)
4. no gaps require new tests

