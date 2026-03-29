# self-review r3: has-self-run-verification

## the question

dogfood check: did you run the playtest yourself?

---

## what r2 found

r2 discovered a bug: playtest.1 step 1 used `*.declapract.ts` which only matches 2 files, not 4.

---

## the fix

changed the glob from `*.declapract.ts` to `*.declapract*.ts`

### before

```sh
find ... -name "*.declapract.ts" | wc -l
```

matches:
- use.apikeys.sh.declapract.ts
- use.apikeys.json.declapract.ts

count: 2

### after

```sh
find ... -name "*.declapract*.ts" | wc -l
```

matches:
- use.apikeys.sh.declapract.ts
- use.apikeys.sh.declapract.test.ts
- use.apikeys.json.declapract.ts
- use.apikeys.json.declapract.test.ts

count: 4

---

## verification

the fix is correct because:
1. the expected count was always 4 (see line 26 of playtest)
2. the glob now matches both .declapract.ts and .declapract.test.ts files
3. a foreman can now verify the step successfully

---

## why it holds

1. found a real bug via self-run (glob pattern mismatch)
2. fixed the playtest to match reality
3. the playtest now accurately reflects what exists
4. self-run uncovered an issue that would have blocked foreman

the self-run verification worked as intended.

