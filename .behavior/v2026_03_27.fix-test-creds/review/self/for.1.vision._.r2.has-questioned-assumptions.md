# self-review r2: has-questioned-assumptions

fresh eyes. deeper pass. read the actual files.

## new assumptions surfaced (from code inspection)

### 7. vision doesn't mention package.json test:auth removal

**what I found**: the tests/best-practice/package.json has:
- `test:auth` command that sources use.apikeys.sh
- `test` command that does `eval $(ECHO=true npm run --silent test:auth)`

the wish handoff says "remove test:auth from package.json" but my vision doesn't mention this.

**evidence**: line 12 shows `"test:auth": "... . .agent/repo=.this/role=any/skills/use.apikeys.sh"`

**how this should be fixed**: vision should mention that package.json changes are part of the scope.

---

### 8. persist-with-dynamodb doesn't need changes

**what I found**: persist-with-dynamodb/best-practice/jest.integration.env.ts is only 6 lines and doesn't have the apikeys check. it only sets dynamodb endpoint.

**evidence**: read the file - no use.apikeys reference.

**why this holds**: only tests best-practice needs jest env file changes. vision doesn't claim otherwise, but I assumed both needed changes.

---

### 9. cicd-common has use.apikeys files that need removal

**what I found**: cicd-common/best-practice has:
- use.apikeys.sh
- use.apikeys.json
- their .declapract.ts files

**evidence**: glob shows 6 files related to use.apikeys in cicd-common.

**action**: vision should clarify that cicd-common files are removed (not just tests files updated).

---

### 10. the vision conflates "what changes" across two practices

**what I found**: changes span two practices:
1. **tests best-practice**: update jest env files, update package.json
2. **cicd-common best-practice**: delete use.apikeys files

**why this matters**: the vision should be explicit about which practice gets which change.

---

## assumptions surfaced

### 1. keyrack.source() is synchronous

| question | answer |
|----------|--------|
| evidence? | wish example shows no `await` |
| verified? | no |
| what if async? | template code would need `await`, jest env files would need async wrapper |

**action**: verify API in blueprint phase. if async, templates need adjustment.

---

### 2. daemon behavior is as described

| question | answer |
|----------|--------|
| evidence? | wish says "once per session" |
| verified? | no, haven't tested keyrack daemon |
| what if different? | vision's "aha moment" would be inaccurate |

**verdict**: out of scope for vision. daemon is rhachet's responsibility. vision describes intended behavior, not implementation.

---

### 3. error messages are exactly as shown

| question | answer |
|----------|--------|
| evidence? | inferred from wish |
| verified? | no |
| what if different? | user experience section would be inaccurate |

**action**: verify actual error messages in blueprint phase. update vision if needed.

---

### 4. "ehmpath" is correct form (not "ehmpathy")

| question | answer |
|----------|--------|
| evidence? | wish uses "ehmpath" throughout |
| verified? | wish handoff says "we expect ehmpaths to work in this repo" |
| what if wrong? | auth would fail |

**verdict**: trust the wish. "ehmpath" is the ssh key owner.

---

### 5. migration is potentially a break for repos without rhachet

| question | answer |
|----------|--------|
| evidence? | wish says delete use.apikeys files |
| what happens? | declapract will remove old pattern, add new pattern |
| if repo lacks rhachet? | import fails, tests break |

**issue found**: the migration path assumes all target repos have rhachet installed. if a repo runs `declapract fix` without rhachet, the jest env file will try to import from `rhachet/keyrack` and fail.

**options**:
1. require rhachet as prereq (document in migration guide)
2. dynamic import with try/catch (graceful fallback)
3. make keyrack.source() call optional (check for both keyrack.yml AND rhachet)

the wish doesn't address this. **flag for blueprint**.

---

### 6. vision conflates "vision" with "implementation details"

| question | answer |
|----------|--------|
| evidence? | vision shows exact code snippets |
| is this wrong? | not necessarily, but it mixes levels |
| why does it matter? | vision should paint the picture, blueprint should show the code |

**non-issue**: the wish handoff included code, so vision follows suit. this is fine for internal docs.

---

## what I missed in r1

r1 identified the rhachet-not-installed issue but didn't fully articulate the migration break:

| scenario | before migration | after migration |
|----------|------------------|-----------------|
| repo with rhachet | use.apikeys works | keyrack works |
| repo without rhachet | use.apikeys works | **tests break** |

this is a **backward compat issue** that needs explicit migration guidance.

---

## issues found and fixed

### issue 1: migration break not documented

**what I found**: repos without rhachet would break after declapract fix. the vision didn't call this out as an uncomfortable tradeoff.

**how I fixed it**: added to vision "what is awkward" > "uncomfortable tradeoffs":
- "repos without rhachet would break after declapract fix (need migration guidance)"

**why this matters for next time**: always consider backward compat when a best practice removes an old pattern and adds a new dependency.

---

### issue 2: vision didn't clarify declapract scope

**what I found**: the vision didn't mention:
- package.json test:auth removal
- which practices change (tests vs cicd-common)
- what specific files change in each

**how I fixed it**: added "declapract scope" section to vision with table:
- tests: jest env files + package.json
- cicd-common: delete use.apikeys files

**why this matters for next time**: always read the actual files to understand scope, not just the wish description.

---

## non-issues that hold

### non-issue 1: keyrack.source() sync vs async

**why it holds**: this is an implementation detail to verify in blueprint phase. the vision describes intent, not code. even if async, the vision's description remains accurate.

### non-issue 2: daemon reliability

**why it holds**: daemon behavior is rhachet's responsibility, not declapract's. the vision describes intended user experience, which is accurate regardless of how keyrack implements it.

### non-issue 3: "ehmpath" form

**why it holds**: the wish explicitly uses "ehmpath" and explains it. this is authoritative.

### non-issue 4: code snippets in vision

**why it holds**: the wish handoff included code, so the vision follows suit. for internal docs, this is appropriate.

### non-issue 5: persist-with-dynamodb scope

**why it holds**: inspected the file - only 6 lines, no apikeys check. no changes needed there.

### non-issue 6: jest env files are the right location

**what I questioned**: should keyrack.source() be in jest.env.ts or somewhere else (jest.config.ts, separate bootstrap)?

**why it holds**: the existing apikeys check is in jest.env.ts. following the established pattern minimizes disruption. the jest env file runs before every test, which is the right time to inject credentials.

### non-issue 7: env.test for both integration and acceptance

**what I questioned**: should acceptance tests use 'acceptance' instead of 'test'?

**why it holds**: both integration and acceptance tests run against test environment, not prod. the keyrack env is about which credentials to use, not which test type. 'test' is correct for both.

### non-issue 8: keyrack.yml path is fixed at .agent/keyrack.yml

**what I questioned**: should the path be configurable?

**why it holds**: this is the standard location for agent configuration. consistency across repos is more valuable than flexibility here. if a repo needs a different path, they can fork the practice.

---

## summary of r2

| # | assumption | status | resolution |
|---|------------|--------|------------|
| 1 | sync API | defer | verify in blueprint |
| 2 | daemon behavior | out of scope | rhachet's concern |
| 3 | error messages | defer | verify in blueprint |
| 4 | "ehmpath" form | holds | wish authoritative |
| 5 | migration break | **fixed** | added to vision awkward tradeoffs |
| 6 | code in vision | holds | follows wish pattern |
| 7 | package.json test:auth | **fixed** | added to vision declapract scope |
| 8 | persist-with-dynamodb | holds | inspected file, no changes needed |
| 9 | cicd-common files | **fixed** | added to vision declapract scope |
| 10 | two-practice split | **fixed** | added scope table to vision |
| 11 | jest.env.ts location | holds | follows existing pattern |
| 12 | env.test for both | holds | both test against test env |
| 13 | keyrack.yml path | holds | standard agent config location |

## key learnings

1. **always read the actual files** - the wish describes intent, but the files reveal scope
2. **consider backward compat** - when removing a pattern, think about repos that haven't upgraded
3. **clarify practice boundaries** - when changes span practices, be explicit about which changes where
