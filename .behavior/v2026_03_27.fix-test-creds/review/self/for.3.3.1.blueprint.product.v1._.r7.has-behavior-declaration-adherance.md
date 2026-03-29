# self-review r7: has-behavior-declaration-adherance

review for adherence to the behavior declaration.

## vision adherence checked

### keyrack.source() call pattern

**vision says** (lines 83-91):
```typescript
import { keyrack } from 'rhachet/keyrack';

keyrack.source({
  env: 'test',
  owner: 'ehmpath',
  mode: 'strict',
});
```

**blueprint says** (lines 90, 98-102):
```typescript
import { keyrack } from 'rhachet/keyrack';

  keyrack.source({
    env: 'test',
    owner: 'ehmpath',
    mode: 'strict',
  });
```

**verdict**: exact match. import path, env, owner, mode all identical.

### no keyrack.yml = no-op

**vision says** (line 181): "no keyrack.yml = keyrack.source() is a no-op"

**blueprint says** (lines 96-103):
```typescript
const keyrackYmlPath = join(process.cwd(), '.agent/keyrack.yml');
if (existsSync(keyrackYmlPath)) {
  keyrack.source({...});
}
```

**verdict**: correct. existsSync guard ensures no-op when keyrack.yml absent.

### declapract scope matches

**vision says** (lines 106-110):
- tests: update jest.integration.env.ts, jest.acceptance.env.ts
- tests: update package.json to remove test:auth
- cicd-common: delete use.apikeys.sh, use.apikeys.json

**blueprint says**:
- filediff lines 39-40: `[~] jest.integration.env.ts`, `[~] jest.acceptance.env.ts`
- filediff line 41: `[~] package.json`
- filediff lines 24-29: `[-] use.apikeys.sh`, `[-] use.apikeys.json` and declapract files

**verdict**: exact match on scope.

---

## criteria adherence checked

### usecase.4 criterion: declapract fix deletes old files

**criteria says** (lines 68-72):
- use.apikeys files are removed
- jest.integration.env.ts updated
- jest.acceptance.env.ts updated
- package.json test:auth removed
- package.json test no longer sources

**blueprint implements**:
- bad-practice `old-use-apikeys` with fix: `{ contents: null }` (deletion)
- best-practice updates to jest env files with keyrack.source()
- package.json code section 4 removes test:auth

**verification**: bad-practice check uses FileCheckType.EXISTS (line 111), fix returns null contents (line 114). this is the standard declapract pattern for file deletion.

**verdict**: correct implementation.

### usecase.3 criterion: ci env vars via secrets

**criteria says** (lines 53-55): env vars set in ci workflow, keyrack prefers env vars

**blueprint implements**: buildWorkflowSecretsBlock (lines 141-181)
- gets vars via keyrack cli
- builds secrets block for workflow template
- injects secrets into .test.yml jobs

**verification**: workflow will have:
```yaml
secrets:
  KEY_NAME: ${{ secrets.KEY_NAME }}
```

at runtime, keyrack.source() checks process.env first (built into keyrack), so ci env vars take precedence.

**verdict**: correct implementation.

---

## issues found and fixed

none. blueprint correctly adheres to vision and criteria.

---

## non-issues verified

### non-issue 1: buildWorkflowSecretsBlock async to sync change

**observed**: current implementation is async, blueprint is sync.

**why it holds**: execSync is synchronous. the function no longer needs async since it uses execSync instead of readUseApikeysConfig (which was async due to file read). callers that use `await buildWorkflowSecretsBlock()` still work since await on sync function returns value.

### non-issue 2: keyrack cli vs keyrack.source()

**observed**: jest env files use keyrack.source(), buildWorkflowSecretsBlock uses keyrack cli.

**why it holds**: different contexts require different approaches:
- jest env files run in node, can import keyrack module directly
- buildWorkflowSecretsBlock runs at declapract check time in repo context, uses cli for isolation

---

## summary

| category | count |
|----------|-------|
| vision requirements checked | 3 |
| criteria requirements checked | 2 |
| deviations found | 0 |
| deviations fixed | 0 |
| non-issues verified | 2 |

blueprint correctly adheres to vision and criteria. keyrack.source() call matches vision exactly. file deletions, updates, and ci secrets all implemented per spec.
