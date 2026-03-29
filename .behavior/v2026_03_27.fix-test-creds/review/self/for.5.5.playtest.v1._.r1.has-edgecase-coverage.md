# self-review r1: has-edgecase-coverage

## the question

are edge cases covered? what could go wrong? what inputs are unusual but valid?

---

## edge cases from blackbox criteria (2.1.criteria.blackbox.md)

| edge case | testable in playtest? | why? |
|-----------|----------------------|------|
| keyrack.yml declares keys not needed by tests | no | keyrack runtime behavior |
| daemon not started | no | keyrack runtime behavior |

these are **keyrack runtime edge cases**, not declapract practice edge cases. the playtest verifies the declapract library, not keyrack's runtime.

---

## edge cases for the declapract practice

### edge 1: repo has no use.apikeys.sh

**scenario**: consumer repo never had use.apikeys.sh (already clean)

**what happens**:
- bad-practice uses `FileCheckType.EXISTS`
- if file doesn't exist, check doesn't match
- no fix attempted

**covered?** yes — FileCheckType.EXISTS semantics

### edge 2: repo has no keyrack.yml

**scenario**: consumer repo doesn't have keyrack.yml yet

**what happens**:
- jest env file has `if (existsSync(keyrackYmlPath))`
- keyrack.source() is NOT called
- tests run without credential injection

**covered?** yes — playtest.2 step 3 verifies the existence check

### edge 3: repo already has keyrack.source()

**scenario**: consumer repo already migrated

**what happens**:
- best-practice matches (jest env has keyrack.source)
- bad-practice doesn't match (use.apikeys files absent)
- no changes made

**covered?** yes — declapract is idempotent by design

### edge 4: use.apikeys.sh has custom content

**scenario**: consumer modified use.apikeys.sh with custom logic

**what happens**:
- bad-practice matches on EXISTS (any content)
- fix returns `{ contents: null }` (delete file)
- custom content is lost

**is this correct?** yes — the behavior is to delete legacy files. custom logic should be migrated to keyrack.yml.

**covered?** yes — playtest.1 step 3 verifies fix returns null

---

## what could go wrong in playtest execution?

| what | risk | mitigation |
|------|------|------------|
| foreman not in repo root | commands fail with "No such file" | prerequisites say "cd to repo root" |
| grep output differs | minor format variance | expected output shows key patterns |
| tests fail | unrelated test breakage | foreman can investigate |

---

## why it holds

1. keyrack runtime edge cases are out of scope (keyrack tests those)
2. declapract practice edge cases are covered by design:
   - FileCheckType.EXISTS handles absent files
   - existsSync guard handles absent keyrack.yml
   - declapract is idempotent
3. custom content deletion is intentional behavior
4. playtest prerequisites mitigate execution risks

