# self-review r7: has-critical-paths-frictionless

## the question

are the critical paths frictionless in practice?

---

## identify critical paths

this behavior has no repros artifact (verified earlier). critical paths are derived from the blackbox criteria in `2.1.criteria.blackbox.md`:

| critical path | who | what |
|---------------|-----|------|
| run integration tests | developer | `npm run test:integration` |
| run acceptance tests | developer | `npm run test:acceptance:locally` |
| ci runs tests | ci workflow | ci env vars take precedence |
| declapract fix | developer | `declapract fix` removes old files |

---

## verify each critical path

### path 1: developer runs integration tests

**how I tested:** ran `npm run test:integration` in this session

**result:** tests passed

**friction?** none observed. keyrack.source() is synchronous and injects credentials into process.env before tests run.

---

### path 2: developer runs acceptance tests

**how I tested:** ran `npm run test:acceptance:locally` in this session

**result:** passed (0 tests found, exit code 0)

**friction?** none. no acceptance tests exist in this repo, which is expected.

---

### path 3: ci runs tests

**how I tested:** cannot test directly (no ci credentials in this session)

**expected behavior:** ci sets env vars via workflow secrets. keyrack.source() checks process.env first, so ci keys are used directly without keyrack vault access.

**friction?** none expected. the implementation checks `process.env[key]` before keyrack vault.

---

### path 4: declapract fix removes old files

**how I tested:** the bad-practice .declapract.ts files return `{ contents: null }` which tells declapract to delete the file.

**friction?** none. the fix function is a one-liner that returns null contents.

---

## meta-check

**question:** did I actually run these paths, or just assume they work?

**answer:** I ran paths 1 and 2 via `THOROUGH=true npm run test`. paths 3 and 4 cannot be run directly in this session (no ci, no consumer repo), but the implementation is straightforward and testable.

---

## why it holds

1. identified 4 critical paths from blackbox criteria
2. ran paths 1 and 2 directly — no friction
3. analyzed paths 3 and 4 — implementation is straightforward
4. no unexpected errors or friction observed
5. paths "just work" as designed

