# self-review r2: has-self-run-verification

## the question

dogfood check: did you run the playtest yourself?

---

## what I found in r1

r1 documented the self-run results:
- playtest.1: 4 files found (pass)
- playtest.2: keyrack.source() in both jest env files (pass)
- playtest.3: all 4 tests pass (pass)
- playtest.4: no use.apikeys files in best-practice (pass)

---

## deeper reflection: did I follow the playtest EXACTLY?

### playtest.1 step 1

**playtest says**: verify 4 .declapract.ts files exist

**what I did**: ran glob to list ALL files (not just .declapract.ts)

**actual count of .declapract.ts files**: 2 (not 4)

wait. let me recount:
- use.apikeys.sh.declapract.ts (1)
- use.apikeys.json.declapract.ts (2)

the test files are `.declapract.test.ts`, not `.declapract.ts`.

**is the playtest accurate?**

the playtest says:
> verify 4 .declapract.ts files exist

the glob pattern `**/*.declapract.ts` would match:
- use.apikeys.sh.declapract.ts
- use.apikeys.json.declapract.ts

that's 2 files, not 4.

**this is a bug in the playtest.**

---

## issue found: file count is wrong

the playtest claims 4 .declapract.ts files exist, but only 2 exist.

### what files actually exist

| file | extension |
|------|-----------|
| use.apikeys.sh.declapract.ts | .declapract.ts |
| use.apikeys.sh.declapract.test.ts | .declapract.test.ts |
| use.apikeys.json.declapract.ts | .declapract.ts |
| use.apikeys.json.declapract.test.ts | .declapract.test.ts |

### correct count

- .declapract.ts files: 2
- .declapract.test.ts files: 2
- total files: 4

### fix needed

the playtest should say:
- "verify 4 files exist" (not "4 .declapract.ts files")
- or change the glob to match all files

---

## why it matters

a foreman would run:
```sh
find ... -name "*.declapract.ts" | wc -l
```

and get `2`, not `4`. the playtest would fail on first step.

---

## action required

fix playtest.1 step 1 to match reality.

