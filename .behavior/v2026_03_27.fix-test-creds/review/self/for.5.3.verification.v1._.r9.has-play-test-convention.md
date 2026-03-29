# self-review r9: has-play-test-convention

## the question

are journey test files named correctly with `.play.test.ts` suffix?

---

## what tests did this behavior add?

this behavior added:
1. `use.apikeys.sh.declapract.test.ts` — unit test for bad-practice fix function
2. `use.apikeys.json.declapract.test.ts` — unit test for bad-practice fix function

these are NOT journey tests. they are unit tests for declapract check/fix functions.

---

## are there any journey tests for this behavior?

**search for .play. files:**
- no `.play.test.ts` files were added in this behavior

**why not?**
- this behavior adds internal declapract infrastructure
- no user journeys to exercise via play tests
- the "journey" is: developer runs `declapract fix`, files are deleted
- this is tested via the .declapract.test.ts unit tests

---

## should there be journey tests?

**what would a journey test look like?**
- create a fake repo with use.apikeys.sh
- run `declapract fix`
- verify file is deleted

**is this needed?**
- no. the unit tests verify the fix function returns `{ contents: null }`
- declapract's internal logic handles the actual file deletion
- this behavior trusts declapract to delete files when fix returns null

---

## convention check

| test file | type | suffix | convention |
|-----------|------|--------|------------|
| use.apikeys.sh.declapract.test.ts | unit | .test.ts | correct |
| use.apikeys.json.declapract.test.ts | unit | .test.ts | correct |

no journey tests were added, so no `.play.test.ts` convention applies.

---

## why it holds

1. identified all test files added in this behavior
2. both are unit tests, not journey tests
3. unit test suffix (`.test.ts`) is correct
4. no journey tests were needed for this behavior
5. no `.play.test.ts` convention violation

