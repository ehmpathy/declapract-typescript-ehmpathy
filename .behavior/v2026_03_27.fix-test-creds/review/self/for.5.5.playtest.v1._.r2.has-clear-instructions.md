# self-review r2: has-clear-instructions

## the question

can the foreman follow the playtest without prior context? are commands copy-pasteable? are expected outcomes explicit?

---

## critical review of playtest

I re-read the playtest and ran the commands myself. Found issues.

### issue 1: no directory prerequisite

**problem**: commands assume foreman is in repo root, but this is not stated.

**fix**: add to prerequisites: "cd to repo root"

### issue 2: expected outputs don't match actual grep output

**problem**: my expected outputs show clean code snippets, but grep actually outputs with file paths and line markers.

**before** (incorrect):
```
export const check = FileCheckType.EXISTS;
```

**actual grep output**:
```
export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = () => {
```

**fix**: update expected outputs to match actual grep output, or use `cat` instead of `grep -A3`.

### issue 3: ls -la output varies by system

**problem**: `ls -la` shows dates, permissions, sizes — these vary. foreman can't verify exact match.

**fix**: change to simpler verification: "4 files exist in the directory"

### issue 4: only verified .sh file, not .json

**problem**: playtest step 2-3 only verify use.apikeys.sh.declapract.ts, not use.apikeys.json.declapract.ts

**fix**: add verification for .json file too (or note they're identical)

---

## fixes applied

updated playtest 5.5.playtest.v1.i1.md with:
1. added "cd to repo root" to prerequisites
2. simplified ls verification to file count
3. changed expected outputs to match actual command output
4. added note that .json file has identical logic

---

## why it holds after fixes

1. prerequisites now explicit about directory
2. expected outputs match actual command output
3. file existence check is system-agnostic
4. both .sh and .json files are covered
5. commands remain copy-pasteable
6. foreman can follow without prior context

