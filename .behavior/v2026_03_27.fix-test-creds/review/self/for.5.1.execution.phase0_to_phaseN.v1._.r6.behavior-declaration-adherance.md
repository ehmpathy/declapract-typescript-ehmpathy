# self-review r6: behavior-declaration-adherance

## file-by-file verification against vision, criteria, blueprint

### jest.integration.env.ts

**blueprint specification (section 1):**
```typescript
const keyrackYmlPath = join(process.cwd(), '.agent/keyrack.yml');
if (existsSync(keyrackYmlPath))
  keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'strict' });
```

**actual implementation (lines 88-96):**
```typescript
const keyrackYmlPath = join(process.cwd(), '.agent/keyrack.yml');
if (existsSync(keyrackYmlPath))
  keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'strict' });
```

**why this holds:**

1. **static import at top of file (line 7):** `import { keyrack } from 'rhachet/keyrack'`
   - blueprint specifies static import, not dynamic
   - static import fails loudly if rhachet not installed
   - this is correct: rhachet is a required dependency per blueprint dependencies section

2. **existsSync check before keyrack.source():**
   - satisfies criteria "no keyrack.yml: tests execute normally"
   - without this check, repos without keyrack config would fail
   - the check makes keyrack opt-in per repo

3. **parameters match exactly:**
   - `env: 'test'`: matches blueprint, satisfies vision's "ci uses test env"
   - `owner: 'ehmpath'`: matches blueprint, enables daemon session lookup
   - `mode: 'strict'`: matches blueprint, satisfies criteria "all declared keys must be present"

4. **jsdoc comment structure:**
   - `.what = source credentials from keyrack for test env`
   - `.why` lists two points matching blueprint comment structure
   - follows codebase convention for procedure headers

**verdict:** adheres. no deviation.

---

### jest.acceptance.env.ts

**blueprint:** same pattern as integration

**actual implementation (lines 38-46):**
```typescript
const keyrackYmlPath = join(process.cwd(), '.agent/keyrack.yml');
if (existsSync(keyrackYmlPath))
  keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'strict' });
```

**why this holds:**

1. **import present (line 6):** `import { keyrack } from 'rhachet/keyrack'`

2. **same logic as integration:**
   - blueprint says "same pattern as integration"
   - implementation uses identical code block
   - both use `env: 'test'` (acceptance tests also use test credentials)

3. **placement in file:** after aws auth check, before test execution
   - credentials must be injected before tests run
   - matches the pattern from integration env

**verdict:** adheres. no deviation.

---

### package.json (tests best-practice)

**blueprint specification (section 4):**
```diff
- "test:auth": "...",
- "test": "... eval $(ECHO=true npm run --silent test:auth) && ...",
+ "test": "set -eu && npm run test:commits && npm run test:types && ...",
```

**actual implementation:**
- test:auth command: **absent** (correct)
- test command: `"set -eu && npm run test:commits && npm run test:types && npm run test:format && npm run test:lint && npm run test:unit && npm run test:integration && npm run test:acceptance:locally"`

**why this holds:**

1. **test:auth removed:**
   - no `test:auth` key in scripts object
   - satisfies blueprint requirement "remove test:auth command"
   - legacy source pattern eliminated

2. **test command simplified:**
   - starts with `set -eu` for fail-fast
   - no `eval $(...)` pattern that sourced apikeys
   - credentials now injected via keyrack.source() in jest env files

3. **all test commands preserved:**
   - test:unit, test:integration, test:acceptance:locally still present
   - they no longer depend on test:auth

**verdict:** adheres. no deviation.

---

### buildWorkflowSecretsBlock.ts

**blueprint specification (section 3):**
- replace readUseApikeysConfig() with keyrack SDK
- use `keyrack.get({ for: { repo: true }, env: 'test' })`
- extract key names from KeyrackGrantAttempt slugs
- build secrets block

**actual implementation:**
```typescript
const keys = (await keyrack.get({
  for: { repo: true },
  env: 'test',
})) as KeyrackGrantAttempt[];

const keyrackVars = keys.map((k) =>
  (k.status === 'granted' ? k.grant.slug : k.slug).split('.').pop()!,
);
```

**why this holds:**

1. **keyrack SDK invocation matches blueprint exactly:**
   - `keyrack.get({ for: { repo: true }, env: 'test' })`
   - `for: { repo: true }` reads from `.agent/keyrack.yml` in project root
   - `env: 'test'` gets test environment keys

2. **KeyrackGrantAttempt type cast:**
   - blueprint specifies this type
   - enables type-safe access to slug property
   - comment documents the 4-variant union (granted/absent/locked/blocked)

3. **slug extraction logic:**
   - `k.status === 'granted' ? k.grant.slug : k.slug`
   - correctly handles union: granted variant has slug nested at grant.slug
   - other variants have slug at top level
   - `.split('.').pop()!` extracts KEY_NAME from org.env.KEY_NAME

4. **readUseApikeysConfig deleted:**
   - file no longer imports or uses readUseApikeysConfig
   - confirmed by checking imports at top of file

**verdict:** adheres. no deviation.

---

### bad-practice old-use-apikeys

**blueprint specification (section 2):**
```typescript
export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = (contents, context) => {
  return { contents: null };
};
```

**actual implementation (use.apikeys.sh.declapract.ts):**
```typescript
export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = () => {
  return { contents: null };
};
```

**why this holds:**

1. **check = FileCheckType.EXISTS:**
   - matches blueprint exactly
   - for bad-practice, EXISTS means "if file exists, flag it"
   - any use.apikeys.sh file triggers the bad-practice detection

2. **fix returns { contents: null }:**
   - matches blueprint semantics
   - `contents: null` tells declapract to delete the file
   - satisfies criteria "use.apikeys files removed"

3. **unused parameters omitted:**
   - blueprint shows `(contents, context)` but lint removes unused
   - functionally identical: `() => { return { contents: null }; }`
   - the fix doesn't need contents or context to delete

4. **test files verify behavior:**
   - use.apikeys.sh.declapract.test.ts verifies check type
   - use.apikeys.json.declapract.test.ts verifies fix returns null
   - tests pass (14 tests total for .test.yml practice)

**verdict:** adheres. no deviation.

---

### .test.yml workflow

**blueprint specification (section 5):**
> add `prepare:rhachet` step to `test-shards-integration` and `test-shards-acceptance` jobs
> insert step after cache restore, before build

**actual implementation:**
- test-shards-integration: step at lines 204-205
- test-shards-acceptance: step at lines 276-277

**why this holds:**

1. **step name and command match:**
   ```yaml
   - name: prepare:rhachet
     run: npm run prepare:rhachet --if-present
   ```
   - `--if-present` ensures repos without rhachet don't fail
   - matches blueprint's note about optional rhachet

2. **placement is correct:**
   - after "get node-modules from cache" (cache restore)
   - before "get aws auth" (which comes before build/test)
   - this ensures symlinks are created before keyrack.source() runs

3. **why this step is needed:**
   - keyrack.yml can `extends:` other manifests
   - these are symlinks created by prepare:rhachet
   - without this step, keyrack.source() can't hydrate extended keys in ci
   - blueprint section 5 explains this: "keyrack.yml can extends: other manifests"

4. **both shard jobs have the step:**
   - test-shards-integration: where jest.integration.env.ts runs
   - test-shards-acceptance: where jest.acceptance.env.ts runs
   - these are the only jobs that invoke keyrack.source()

**verdict:** adheres. no deviation.

---

## vision alignment deep check

| vision goal | how implementation achieves it |
|-------------|--------------------------------|
| once-per-workshift unlock | keyrack.source() delegates to daemon. daemon persists session across terminals. vision describes: "open new terminal... still works!" implementation: keyrack.source() checks daemon, not per-process state. |
| exact commands to fix | keyrack.source() with mode: 'strict' throws ConstraintError. error message includes exact `rhx keyrack unlock` or `rhx keyrack set` commands. vision shows: "error with exact unlock command" |
| secure storage | credentials in keyrack vault, not plaintext env files. implementation: no use.apikeys.json with hardcoded paths. keyrack uses encrypted vault. |
| ci compatibility | keyrack.source() checks process.env first. ci sets env vars via secrets block. buildWorkflowSecretsBlock generates secrets block from keyrack.get(). criteria "env vars set in ci: tests use them" satisfied. |

---

## criteria cross-check

| criterion | implementation | verification |
|-----------|----------------|--------------|
| keyrack unlocked + keys set: tests execute | keyrack.source() injects into process.env | keyrack behavior, not our code |
| keyrack locked: error with unlock command | keyrack.source({ mode: 'strict' }) | throws ConstraintError per keyrack |
| keys absent: error with set commands | keyrack.source({ mode: 'strict' }) | throws with list of absent keys |
| no keyrack.yml: tests execute normally | existsSync(keyrackYmlPath) check | verified in jest.*.env.ts |
| declapract fix removes old files | bad-practice fix returns null | verified in test |
| idempotent | declapract check/fix semantics | framework guarantee |

---

## summary

examined 6 changed file groups against vision, criteria, and blueprint:

1. jest.integration.env.ts: keyrack.source() block matches blueprint, satisfies 4 criteria
2. jest.acceptance.env.ts: same pattern, confirmed matching
3. package.json: test:auth removed, test command simplified
4. buildWorkflowSecretsBlock.ts: uses keyrack SDK as specified, handles union correctly
5. bad-practice old-use-apikeys: FileCheckType.EXISTS + null fix for deletion
6. .test.yml: prepare:rhachet step in correct position in both shard jobs

no deviations found. all implementations follow the spec.

