# self-review r3: has-edgecase-coverage

## the question

are edge cases covered? what could go wrong? what inputs are unusual but valid?

---

## what I found in r1 and r2

r1 identified 4 declapract practice edge cases:
1. repo has no use.apikeys.sh — FileCheckType.EXISTS handles
2. repo has no keyrack.yml — existsSync guard handles
3. repo already migrated — idempotent
4. custom content deleted — intentional behavior

r2 dug deeper into implementation edge cases:
1. empty file — unit test covers
2. symlink — declapract handles
3. keyrack.source throws — documented prerequisite
4. rhachet not installed — documented prerequisite

---

## what I haven't checked: the actual playtest boundaries

let me re-read the playtest and identify boundary conditions:

### boundary 1: file count verification

playtest.1 step 1:
```sh
find src/practices/cicd-common/bad-practices/old-use-apikeys -name "*.declapract.ts" | wc -l
```

**what if there are 5 files instead of 4?**
- could happen if someone adds another bad file
- playtest would fail (5 != 4)
- this is CORRECT behavior — forces review

**what if there are 3 files?**
- could happen if a file is absent
- playtest would fail (3 != 4)
- this is CORRECT behavior — detects regression

---

### boundary 2: grep pattern match

playtest.1 step 2:
```sh
grep -A3 'export const check' ...
```

**what if the export is renamed?**
- e.g., `export const checkBadPractice = ...`
- grep would not match
- foreman would notice output differs from expected

**what if there are multiple exports?**
- grep -A3 would show first match + 3 lines
- foreman would see the check = FileCheckType.EXISTS line

---

### boundary 3: tests pass gate

playtest.3:
```sh
npm run test
```

**what if tests pass but with warnings?**
- exit code 0 = pass
- foreman may notice warnings in output
- up to foreman to decide if warnings matter

**what if tests are slow (timeout)?**
- jest has default timeout
- if tests timeout, they fail
- playtest would fail correctly

---

### boundary 4: file absence verification

playtest.4:
```sh
ls src/practices/cicd-common/best-practice/.agent/repo=.this/role=any/skills/use.apikeys* 2>&1
```

**what if the directory doesn't exist?**
- ls fails with different error message
- "No such file or directory" still appears
- playtest passes (file is absent)

**what if a different use.apikeys file exists?**
- e.g., use.apikeys.yml (not .sh or .json)
- glob `use.apikeys*` would match it
- playtest would fail
- this is CORRECT behavior — catches unexpected files

---

## boundary I overlooked: existence check location

playtest.2 step 3 verifies existence check:
```sh
grep -B5 'keyrack.source' src/practices/tests/best-practice/jest.integration.env.ts
```

**what if existence check is AFTER keyrack.source?**
```typescript
keyrack.source({ ... });
if (existsSync(keyrackYmlPath)) { ... }  // wrong order
```

- grep -B5 would show lines BEFORE keyrack.source
- existence check would NOT appear in output
- foreman would notice expected output doesn't match

this is a good catch — the playtest verifies correct order.

---

## why it holds after boundary analysis

1. file count boundary: correct behavior on mismatch
2. grep pattern boundary: foreman sees diff from expected
3. tests pass boundary: exit code is binary pass/fail
4. file absence boundary: catches unexpected files
5. existence check order: grep -B5 verifies correct position

all boundaries lead to correct playtest behavior.

