# self-review r8: has-behavior-declaration-adherance

deep line-by-line review of behavior declaration adherence.

## wish adherence checked

### wish.migration-guide keyrack.source() call

**wish says** (lines 62-66):
```typescript
keyrack.source({
  env: 'test',
  owner: 'ehmpath',
  mode: 'strict',
});
```

**blueprint says** (lines 98-102):
```typescript
keyrack.source({
  env: 'test',
  owner: 'ehmpath',
  mode: 'strict',
});
```

**verdict**: exact match. all three params identical.

### wish.migration-guide import statement

**wish says** (line 49):
```typescript
import { keyrack } from 'rhachet/keyrack';
```

**blueprint says** (line 90):
```typescript
import { keyrack } from 'rhachet/keyrack';
```

**verdict**: exact match. static import from rhachet/keyrack.

### wish.migration-guide package.json changes

**wish says** (lines 77-79):
```diff
- "test:auth": "... source .agent/.../use.apikeys.sh ...",
- "test": "... eval $(ECHO=true npm run --silent test:auth) && ...",
+ "test": "... npm run test:commits && ...",
```

**blueprint says** (lines 188-192):
```diff
- "test:auth": "...",
- "test": "... eval $(ECHO=true npm run --silent test:auth) && ...",
+ "test": "set -eu && npm run test:commits && npm run test:types && ...",
```

**verdict**: match. blueprint adds `set -eu` which is consistent with safe-shell-vars brief.

### wish.files-changed table

**wish says** (lines 125-131):
| file | action |
| jest.integration.env.ts | replace apikeys check with keyrack.source() |
| jest.acceptance.env.ts | replace apikeys check with keyrack.source() |
| .agent/keyrack.yml | add keys under env.test |
| package.json | remove test:auth, upgrade rhachet |
| use.apikeys.sh | delete |
| use.apikeys.json | delete |

**blueprint covers**:
- jest.integration.env.ts: filediff line 39, code section 1
- jest.acceptance.env.ts: filediff line 40
- .agent/keyrack.yml: out of scope (repo-specific, not declapract)
- package.json: filediff line 41, code section 4
- use.apikeys.sh: filediff lines 24-26 (delete from best-practice)
- use.apikeys.json: filediff lines 27-29 (delete from best-practice)

**verdict**: all files covered. keyrack.yml correctly out of scope for declapract.

---

## vision adherence checked

### vision.keyrack-source-call (lines 83-91)

**vision says**:
```typescript
import { keyrack } from 'rhachet/keyrack';

keyrack.source({
  env: 'test',
  owner: 'ehmpath',
  mode: 'strict',
});
```

**blueprint says** (lines 90, 98-102): exact match.

**verdict**: exact match.

### vision.no-keyrack-yml-noop (line 181)

**vision says**: "no keyrack.yml = keyrack.source() is a no-op"

**blueprint implements** (lines 96-103):
```typescript
const keyrackYmlPath = join(process.cwd(), '.agent/keyrack.yml');
if (existsSync(keyrackYmlPath)) {
  keyrack.source({...});
}
```

**verdict**: correct. existsSync guard ensures no-op when keyrack.yml absent.

### vision.declapract-scope (lines 106-111)

**vision says**:
- tests: update jest.integration.env.ts
- tests: update jest.acceptance.env.ts
- tests: update package.json remove test:auth
- cicd-common: delete use.apikeys.sh
- cicd-common: delete use.apikeys.json

**blueprint filediff**:
- line 39: `[~] jest.integration.env.ts`
- line 40: `[~] jest.acceptance.env.ts`
- line 41: `[~] package.json`
- lines 24-26: `[-] use.apikeys.sh` and declapract files
- lines 27-29: `[-] use.apikeys.json` and declapract files

**verdict**: exact match on scope.

---

## criteria adherence checked

### usecase.1 criterion: keyrack locked error

**criteria says** (lines 11-15):
- error thrown with exact unlock command
- error includes: `rhx keyrack unlock --env test --owner ehmpath`

**blueprint delegates**: keyrack.source() with `mode: 'strict'` handles this internally.

**verdict**: correct delegation. keyrack module owns error messages.

### usecase.4 criterion: declapract fix behavior

**criteria says** (lines 53-60):
- use.apikeys files are removed
- jest.integration.env.ts updated to use keyrack.source()
- jest.acceptance.env.ts updated to use keyrack.source()
- package.json test:auth removed
- package.json test no longer sources

**blueprint implements**:
- bad-practice `old-use-apikeys` with fix: `{ contents: null }` (deletion)
- best-practice updates to jest env files with keyrack.source()
- package.json code section 4 removes test:auth

**verdict**: correct implementation.

### usecase.3 criterion: ci env vars

**criteria says** (lines 44-47): env vars set in ci workflow, keyrack prefers env vars

**blueprint implements**: buildWorkflowSecretsBlock (lines 141-181)
- gets vars via keyrack cli
- builds secrets block for workflow template
- injects secrets into .test.yml jobs

**verdict**: correct. keyrack.source() checks process.env first (built into keyrack).

---

## issues found and fixed

none. blueprint correctly adheres to wish, vision, and criteria.

---

## non-issues verified

### non-issue 1: keyrack.yml path difference

**observed**: wish uses `.agent/keyrack.yml`, blueprint uses `.agent/keyrack.yml`.

**why it holds**: exact match. both use `.agent/keyrack.yml` relative to cwd.

### non-issue 2: buildWorkflowSecretsBlock async to sync

**observed**: current implementation is async, blueprint is sync.

**why it holds**: execSync is synchronous. no async needed since cli invocation replaces async file read.

### non-issue 3: owner parameter hardcoded

**observed**: blueprint hardcodes `owner: 'ehmpath'`.

**why it holds**: vision line 89 explicitly specifies `owner: 'ehmpath'`. this is the ehmpathy org owner.

---

## summary

| category | count |
|----------|-------|
| wish requirements checked | 4 |
| vision requirements checked | 3 |
| criteria requirements checked | 3 |
| deviations found | 0 |
| deviations fixed | 0 |
| non-issues verified | 3 |

blueprint correctly adheres to wish, vision, and criteria. keyrack.source() call matches wish exactly. file changes, deletions, and ci secrets all implemented per spec.
