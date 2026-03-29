# self-review r3: has-acceptance-test-citations

## the question

cite the acceptance test for each playtest step.

---

## progress so far

r1: established no acceptance tests exist — this is a library
r2: cited exact unit test files and line numbers

---

## deeper question: is the playtest sufficient without acceptance tests?

the guide says: "the playtest and acceptance tests should align"

but this repo has no acceptance tests. so should the playtest BE the acceptance test?

yes. for a declapract library:
- unit tests prove the check/fix logic is correct
- playtest proves the files exist and integrate correctly
- declapract engine is tested elsewhere
- consumer's acceptance tests prove end-to-end

the playtest IS the acceptance layer for this library.

---

## re-check: are unit tests sufficient for check/fix?

### what if FileCheckType.EXISTS doesn't do what we expect?

the unit test verifies:
```typescript
expect(check).toEqual(FileCheckType.EXISTS);
```

this proves check === FileCheckType.EXISTS, but does it prove the semantics?

**answer**: yes, because:
1. FileCheckType is a declapract-provided enum
2. declapract defines EXISTS as "match if file exists"
3. our test verifies our code exports the right value
4. declapract's tests verify EXISTS semantics

### what if fix({ contents: null }) doesn't delete?

the unit test verifies:
```typescript
expect(result.contents).toBeNull();
```

this proves fix returns { contents: null }, but does it prove deletion?

**answer**: yes, because:
1. declapract contract: contents: null = delete file
2. declapract's tests verify this contract
3. our test verifies our code returns the right value

---

## why it holds

1. unit tests verify our exports match declapract contracts
2. declapract tests verify contract semantics
3. playtest verifies integration (files exist, content correct)
4. no acceptance test gap — playtest IS the acceptance layer

