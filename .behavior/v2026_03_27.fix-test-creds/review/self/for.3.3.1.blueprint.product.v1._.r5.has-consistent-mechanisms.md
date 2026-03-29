# self-review r5: has-consistent-mechanisms

deeper review for new mechanisms that duplicate extant functionality.

## extant mechanisms discovered

searched codebase for relevant patterns:

| mechanism | location | pattern |
|-----------|----------|---------|
| readFile.ts | src/utils/ | async promisify(fs.readFile) |
| readFileSync | jest.*.env.ts | sync direct fs call |
| execSync | jest.integration.env.ts:76 | sync subprocess for psql |
| require() for json | jest.*.env.ts:99,49 | sync json file load |
| existsSync | jest.*.env.ts | sync file existence check |
| buildWorkflowSecretsBlock | src/utils/ | async, calls readUseApikeysConfig |

## mechanisms scrutinized

### mechanism 1: async to sync shift in buildWorkflowSecretsBlock

**current**:
```typescript
export const buildWorkflowSecretsBlock = async (input, context) => {
  const apikeysConfig = await readUseApikeysConfig({...});
  // ...
};
```

**proposed**:
```typescript
export const buildWorkflowSecretsBlock = (input, context) => {
  const keyrackVarsJson = execSync('npx rhx keyrack get-vars --env test --json').toString('utf-8');
  // ...
};
```

**callers identified**:
- test.yml.declapract.ts (line 17, 40)
- publish.yml.declapract.ts (line 17, 40)
- deploy.yml.declapract.ts (line 17, 40)

**analysis**: all callers use `await buildWorkflowSecretsBlock()`. if function becomes sync, await on sync function returns value directly. backwards compatible.

**consistency check**: codebase uses BOTH sync and async patterns:
- readFile.ts: async
- readFileSync in jest env: sync
- execSync in jest env: sync

**verdict**: consistent — both patterns exist in codebase. sync is simpler for this use case.

---

### mechanism 2: require() vs static import for keyrack

**current pattern** (jest env files):
```typescript
const config = require(apikeysConfigPath); // json file
```

**proposed pattern**:
```typescript
import { keyrack } from 'rhachet/keyrack'; // module
```

**analysis**: require() is used for dynamic json file loads (path known at runtime). static import is used for module imports. keyrack is a module, not a json file. static import is correct.

**verdict**: consistent — require() for dynamic json, static import for modules.

---

### mechanism 3: readFile.ts utility not reused

**extant utility**: src/utils/readFile.ts (async)

**blueprint proposes**: execSync for CLI invocation, not file read

**analysis**: blueprint doesn't read keyrack.yml directly. it invokes keyrack CLI which handles yml parse internally. readFile.ts is not applicable.

**verdict**: not duplication — different purpose (file read vs CLI invocation).

---

### mechanism 4: impact on all three workflow files

**observation**: blueprint filediff shows only test.yml changes, but buildWorkflowSecretsBlock is used by:
- test.yml.declapract.ts
- publish.yml.declapract.ts
- deploy.yml.declapract.ts

**analysis**: all three call buildWorkflowSecretsBlock. the utility change affects all callers. this is correct — single point of change.

**question**: do publish and deploy workflows need keyrack vars?

**search**: wish mentions ".test.yml" specifically. criteria focuses on test workflows.

**resolution**: buildWorkflowSecretsBlock is shared infrastructure. if keyrack.yml declares vars, all workflows get them. if not, no-op. consistent with wish.

**verdict**: consistent — shared utility pattern maintained.

---

### mechanism 5: jest env file pattern consistency

**both integration and acceptance** have identical apikeys check pattern (lines 93-120 and 43-69).

**blueprint proposes**: same keyrack.source() pattern for both files.

**analysis**: consistent — both files get identical update.

**verdict**: consistent — parallel structure maintained.

---

## issues found and fixed

### issue 1: blueprint filediff underspecified

**found**: filediff shows `[~] jest.integration.env.ts` and `[~] jest.acceptance.env.ts` but doesn't show that publish.yml.declapract.ts and deploy.yml.declapract.ts are implicitly updated via buildWorkflowSecretsBlock.

**impact**: none — callers don't change, only the shared utility changes.

**verdict**: not a fix needed — implicit update via shared utility is correct pattern.

---

## non-issues verified

### non-issue 1: async to sync shift

**why it holds**: codebase uses both patterns. sync is simpler here. callers with await still work.

### non-issue 2: require() vs static import

**why it holds**: require() for json files, static import for modules. keyrack is a module.

### non-issue 3: readFile.ts not reused

**why it holds**: blueprint invokes CLI, doesn't read file directly. different purpose.

### non-issue 4: shared utility impacts all workflows

**why it holds**: single point of change is the correct pattern. all workflows benefit from keyrack if configured.

### non-issue 5: jest env parallel structure

**why it holds**: both integration and acceptance files get identical update pattern.

---

## summary

| category | count |
|----------|-------|
| extant mechanisms discovered | 6 |
| mechanisms scrutinized | 5 |
| duplication violations found | 0 |
| issues found | 1 (underspecified filediff, no fix needed) |
| non-issues verified | 5 |

blueprint uses extant mechanisms consistently. async-to-sync shift is backwards compatible. all workflows benefit from shared utility update.
