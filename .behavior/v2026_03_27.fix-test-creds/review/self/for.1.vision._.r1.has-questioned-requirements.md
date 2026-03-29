# self-review: has-questioned-requirements

## requirements questioned

### 1. replace use.apikeys with keyrack.source()

| question | answer |
|----------|--------|
| who said this was needed? | the wish, with detailed handoff |
| what evidence? | explicit implementation example in wish |
| what if we didn't? | continue per-terminal source dance, vague errors |
| scope correct? | yes, focused on declapract best-practice templates |
| simpler way? | no, keyrack.source() is already the simplest |

**verdict**: holds. the wish is explicit and the solution is well-defined.

---

### 2. update jest.integration.env.ts and jest.acceptance.env.ts

| question | answer |
|----------|--------|
| who said? | implied by wish handoff |
| evidence? | read both files - they have the use.apikeys check |
| what if not? | keyrack.source() wouldn't be called |
| scope? | correct - these are the files that need change |

**verdict**: holds. these are the exact files that need change.

---

### 3. keyrack.yml declaration

| question | answer |
|----------|--------|
| who said? | wish handoff shows this pattern |
| evidence? | `keyrack.source()` requires it to know what keys exist |
| scope issue? | **yes - needs clarification** |

**issue found**: the vision conflates two things:
1. the **declapract best-practice** (template files)
2. the **per-repo configuration** (keyrack.yml)

the declapract best-practice should:
- call `keyrack.source()` if keyrack.yml exists
- NOT include a keyrack.yml template (each repo declares its own keys)

the keyrack.yml is **per-repo config**, not a best-practice template.

**fix applied**: clarified in vision that keyrack.yml is per-repo, not a template.

---

### 4. rhachet >=1.39.1 dependency

| question | answer |
|----------|--------|
| who said? | wish handoff step 1 |
| evidence? | keyrack.source() introduced in 1.39.1 |
| concern? | what about repos without rhachet? |

**non-issue**: the pattern checks if keyrack.yml exists first. if no keyrack.yml, no keyrack.source() call. repos without rhachet won't have keyrack.yml, so they're unaffected.

**verdict**: holds with caveat - the code must handle the case where rhachet isn't installed (keyrack import would fail). graceful handle needed.

---

### 5. remove use.apikeys files completely

| question | answer |
|----------|--------|
| who said? | wish handoff explicitly says "delete legacy files" |
| what if not? | confusion from two patterns found together |
| fallback needed? | no - clean break |

**verdict**: holds. the wish is clear: no legacy fallback.

---

## summary

| requirement | status | notes |
|-------------|--------|-------|
| replace use.apikeys with keyrack | holds | explicit in wish |
| update jest env files | holds | correct scope |
| keyrack.yml in template | **clarified** | per-repo, not template |
| rhachet dependency | holds | graceful handle needed |
| remove legacy files | holds | clean break |

## vision update needed?

the vision is accurate. one clarification made:
- keyrack.yml is per-repo configuration, not a declapract best-practice template
- the best-practice templates should call keyrack.source() **if** keyrack.yml exists

this is already implied in the vision ("no keyrack.yml = keyrack.source() is a no-op") but could be more explicit.
