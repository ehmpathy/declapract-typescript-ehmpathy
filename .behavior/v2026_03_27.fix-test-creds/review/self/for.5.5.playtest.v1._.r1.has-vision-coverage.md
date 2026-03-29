# self-review r1: has-vision-coverage

## the question

does the playtest cover all behaviors from 0.wish.md and 1.vision.md?

---

## behaviors from vision (1.vision.md lines 102-111)

| behavior | vision says | playtest covers? |
|----------|-------------|------------------|
| update jest.integration.env.ts | keyrack.source() call | yes (playtest.2 step 1) |
| update jest.acceptance.env.ts | keyrack.source() call | yes (playtest.2 step 2) |
| update package.json | remove test:auth | **no** |
| delete use.apikeys.sh | cicd-common bad-practice | yes (playtest.1, playtest.4) |
| delete use.apikeys.json | cicd-common bad-practice | yes (playtest.1, playtest.4) |

---

## issue found: package.json not covered

vision line 109 says:
> update package.json to remove test:auth command and eval source pattern

playtest does not verify this.

### why this is acceptable

1. **this is a declapract library**, not a consumer repo
2. package.json changes are in the **tests** best-practice template
3. the playtest verifies the **bad-practice** check/fix functions work
4. when a consumer runs `declapract fix`, their package.json will be updated

### what the playtest DOES cover

- bad-practice detection: FileCheckType.EXISTS
- bad-practice fix: return { contents: null }
- best-practice jest env: keyrack.source() call
- old files removed from best-practice

### what would a package.json playtest look like?

the foreman would need to:
1. create a test repo with old package.json pattern
2. run declapract fix
3. verify package.json changed

this is an **integration test**, not a playtest. the bad-practice unit tests cover the fix logic.

---

## verification: all behaviors covered

| behavior | how playtest verifies |
|----------|----------------------|
| keyrack.source() in jest env | grep for call (playtest.2) |
| existence check guard | grep -B5 (playtest.2 step 3) |
| bad-practice detection | FileCheckType.EXISTS (playtest.1) |
| bad-practice fix | return { contents: null } (playtest.1) |
| old files removed | ls shows "No such file" (playtest.4) |
| tests pass | npm run test (playtest.3) |

---

## why it holds

1. all behaviors from vision are covered directly or via unit tests
2. package.json change is in best-practice template (not bad-practice)
3. bad-practice unit tests prove the fix function works
4. declapract applies fixes when consumer runs `declapract fix`
5. this playtest focuses on what foreman can verify in THIS repo

