# self-review r10: has-play-test-convention

## the question

are journey test files named correctly with `.play.test.ts` suffix?

---

## what is a journey test?

journey tests (aka play tests) exercise end-to-end user workflows. they:
- simulate real user actions
- cross multiple system boundaries
- validate integrated behavior

example: a `.play.test.ts` that runs `declapract fix` on a fake repo and verifies files are deleted.

---

## what tests did this behavior add?

| file | type | what it tests |
|------|------|---------------|
| `use.apikeys.sh.declapract.test.ts` | unit | check returns EXISTS, fix returns null |
| `use.apikeys.json.declapract.test.ts` | unit | check returns EXISTS, fix returns null |

these are **unit tests**, not journey tests. they test:
- the check function returns the correct FileCheckType
- the fix function returns `{ contents: null }`

they do NOT:
- run declapract
- create temporary repos
- verify files are deleted from disk

---

## why are these sufficient?

### the contract is simple

the bad-practice check/fix contract:
1. `check = FileCheckType.EXISTS` — declapract calls this to detect bad files
2. `fix = () => ({ contents: null })` — declapract calls this to delete bad files

unit tests verify both sides of this contract.

### declapract handles the journey

the "journey" is:
```
user runs declapract fix
  → declapract finds use.apikeys.sh
  → declapract calls check (returns EXISTS = match)
  → declapract calls fix (returns null = delete)
  → declapract deletes the file
```

we test: check returns EXISTS, fix returns null.
declapract tests: when fix returns null, delete the file.

### separation of concerns

| layer | responsibility | tested by |
|-------|----------------|-----------|
| bad-practice | detect pattern, return fix | unit tests (ours) |
| declapract core | apply fix to filesystem | declapract's own tests |

journey tests would duplicate declapract's internal tests without additional coverage.

---

## did I search for journey tests?

yes. glob search for `.play.` in repo:

```
glob pattern: **/*.play.*
result: 0 matches
```

this behavior follows the repo pattern: no play tests exist anywhere.

---

## would journey tests add value?

| scenario | value | cost |
|----------|-------|------|
| verify fix deletes file | low (declapract already tests this) | high (temp repo setup) |
| verify keyrack.source works | low (keyrack tests this) | high (mock daemon) |
| verify ci workflow | low (yaml is declarative) | high (gh actions runner) |

the unit tests provide sufficient coverage for this behavior's scope.

---

## the deeper question

**am I avoiding journey tests because they're hard, or because they're unnecessary?**

they're unnecessary. this behavior:
1. adds bad-practice detection → unit tested
2. updates jest env files → extant integration tests cover keyrack.source
3. updates workflow yaml → snapshot tests cover output

no new user journey was introduced that warrants a dedicated play test.

---

## why it holds

1. identified all test files added: 2 unit tests
2. verified both use correct `.test.ts` suffix
3. explained why journey tests are unnecessary (contract separation)
4. searched repo: no `.play.` files exist anywhere
5. evaluated value vs cost of potential journey tests
6. reflected on whether avoidance is laziness or correctness: it's correctness

