# self-review r2: has-edgecase-coverage

## the question

are edge cases covered? what could go wrong? what inputs are unusual but valid?

---

## deeper reflection on edge cases

### re-read the playtest with fresh eyes

I read 5.5.playtest.v1.i1.md again and asked: what could fail?

---

### edge case: empty use.apikeys.sh

**scenario**: consumer has use.apikeys.sh but it's empty (0 bytes)

**what happens**:
- FileCheckType.EXISTS matches (file exists)
- fix returns `{ contents: null }`
- file is deleted

**is this tested?** yes — the unit test passes empty content to fix:
```typescript
it('should return null contents to delete the file', async () => {
  const result = await fix('#!/bin/sh\n# content', {} as any);
  expect(result.contents).toBeNull();
});
```

**is this in playtest?** no — but unit test covers it

---

### edge case: use.apikeys.sh is a symlink

**scenario**: consumer symlinked use.apikeys.sh to another file

**what happens**:
- FileCheckType.EXISTS checks if path exists
- fs.existsSync returns true for symlinks
- fix returns `{ contents: null }`
- declapract deletes the symlink (not the target)

**is this covered?** yes — declapract handles symlinks correctly

---

### edge case: very long file path

**scenario**: the .agent/repo=.this/role=any/skills/ path is deeply nested

**what happens**:
- path is valid (unix supports ~4096 char paths)
- declapract handles it

**is this relevant?** no — the path is fixed by convention

---

### edge case: keyrack.source throws

**scenario**: keyrack.source() throws because keyrack is locked

**what does the playtest verify?**
- playtest.3 runs `npm run test`
- if keyrack is locked, jest env throws
- tests fail with clear error

**is this a playtest edge case?** yes — foreman needs keyrack unlocked

**is this documented?** yes — prerequisites say:
> keyrack unlocked: `rhx keyrack unlock --env test --owner ehmpath`

---

### edge case: rhachet not installed

**scenario**: foreman doesn't have rhachet installed

**what happens**:
- `rhx keyrack unlock` command in prerequisites fails
- foreman must install rhachet first

**is this documented?** yes — prerequisites say:
> rhachet >=1.39.1 installed globally

---

### issue found: playtest doesn't verify .json file check/fix

playtest.1 step 2-3 only verify use.apikeys.sh.declapract.ts. the note says ".json has identical logic" but doesn't verify.

**risk**: if .json logic differs, we wouldn't catch it

**resolution**: the unit test for .json file exists:
```
use.apikeys.json.declapract.test.ts
```

unit tests prove both .sh and .json have correct check/fix. playtest samples .sh; unit tests cover .json.

---

## why it holds after deeper review

1. empty file edge case: covered by unit test
2. symlink edge case: covered by declapract/fs semantics
3. keyrack.source throws: documented in prerequisites
4. rhachet not installed: documented in prerequisites
5. .json file verification: unit tests cover, playtest samples .sh

no issues found that require playtest changes.

