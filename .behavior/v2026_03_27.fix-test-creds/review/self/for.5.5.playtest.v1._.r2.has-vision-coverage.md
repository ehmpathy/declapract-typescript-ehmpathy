# self-review r2: has-vision-coverage

## the question

does the playtest cover all behaviors from 0.wish.md and 1.vision.md?

---

## deeper investigation: package.json coverage

in r1 I noted package.json was not in playtest. let me investigate.

### what does the vision say about package.json?

vision line 109:
> update package.json to remove test:auth command and eval source pattern

wish line 74-80:
```diff
- "test:auth": "... source .agent/.../use.apikeys.sh ...",
- "test": "... eval $(ECHO=true npm run --silent test:auth) && ...",
+ "test": "... npm run test:commits && ...",
```

### what does the best-practice package.json contain?

I read `src/practices/tests/best-practice/package.json` (lines 11-17):

```json
{
  "test:unit": "set -eu && jest ...",
  "test:integration": "set -eu && jest ...",
  "test": "set -eu && npm run test:commits && npm run test:types && ..."
}
```

**there is no test:auth**. the package.json already has the new pattern.

### why is test:auth removal NOT in the bad-practice?

the bad-practice only deletes use.apikeys.sh and use.apikeys.json files. it does NOT modify package.json.

**why?** declapract best-practice CONTAINS check handles this:
- best-practice defines what commands SHOULD be
- declapract overwrites consumer's commands to match

the bad-practice file deletion is separate from the package.json update.

### verification: no bad-practice for package.json

```sh
ls src/practices/cicd-common/bad-practices/old-use-apikeys/
```

only contains:
- use.apikeys.sh.declapract.ts
- use.apikeys.json.declapract.ts
- (and test files)

no package.json.declapract.ts exists.

---

## coverage matrix after investigation

| behavior | source | playtest covers? | why? |
|----------|--------|------------------|------|
| update jest.integration.env.ts | vision, wish | yes | playtest.2 step 1 |
| update jest.acceptance.env.ts | vision, wish | yes | playtest.2 step 2 |
| remove test:auth from package.json | wish | N/A | best-practice handles via CONTAINS |
| delete use.apikeys.sh | vision, wish | yes | playtest.1, playtest.4 |
| delete use.apikeys.json | vision, wish | yes | playtest.1, playtest.4 |

### why test:auth is N/A for playtest

1. best-practice package.json already defines correct commands
2. declapract fix overwrites consumer's package.json
3. no bad-practice for package.json needed — best-practice handles it
4. playtest verifies THIS repo, not consumer workflow

---

## coverage of 0.wish.md

wish says: "upgrade the best practice to use keyrack.source() instead of the adhoc use.apikeys.sh"

playtest verifies:
- keyrack.source() is in jest env files (playtest.2)
- use.apikeys files deleted from best-practice (playtest.4)
- bad-practice exists to clean consumer repos (playtest.1)

**all wish requirements covered.**

---

## why it holds

1. investigated package.json concern — resolved via best-practice CONTAINS
2. all behaviors from vision are covered or delegated correctly
3. all behaviors from wish are covered
4. no requirements left untested
5. playtest scope is appropriate for THIS repo (declapract library)

