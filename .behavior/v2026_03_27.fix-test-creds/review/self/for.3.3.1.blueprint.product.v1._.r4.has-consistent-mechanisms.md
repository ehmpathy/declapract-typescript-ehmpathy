# self-review r4: has-consistent-mechanisms

review for new mechanisms that duplicate extant functionality.

## mechanisms scrutinized

### mechanism 1: execSync for keyrack CLI invocation

**proposed in blueprint**:
```typescript
import { execSync } from 'node:child_process';
const keyrackVarsJson = execSync('npx rhx keyrack get-vars --env test --json').toString('utf-8');
```

**search of codebase**: jest.integration.env.ts already uses execSync for psql connectivity check (lines 76-79).

**analysis**: execSync is an extant pattern in this codebase. blueprint reuses it consistently.

**verdict**: consistent — execSync is already used for subprocess invocation.

---

### mechanism 2: existsSync check for keyrack.yml

**proposed in blueprint**:
```typescript
if (existsSync(keyrackYmlPath)) {
  keyrack.source({...});
}
```

**search of codebase**: jest.integration.env.ts uses existsSync for:
- package.json check (line 17)
- declapractUsePath check (lines 41-43)
- apikeysConfigPath check (line 97)
- testConfigPath check (line 62)

**analysis**: existsSync is the standard pattern for file existence checks in this codebase.

**verdict**: consistent — existsSync is already used throughout.

---

### mechanism 3: static import for keyrack

**proposed in blueprint**:
```typescript
import { keyrack } from 'rhachet/keyrack';
```

**search of codebase**: all imports in the codebase use static ES module imports. no dynamic require() patterns except for json file reads.

**analysis**: static import matches extant import patterns.

**verdict**: consistent — static imports are the norm.

---

### mechanism 4: FileCheckType.EXISTS for bad-practice

**proposed in blueprint**:
```typescript
export const check = FileCheckType.EXISTS;
export const fix: FileFixFunction = () => {
  return { contents: null };
};
```

**search of codebase**: multiple bad-practices use FileCheckType.EXISTS for file detection with `{ contents: null }` for deletion.

**analysis**: this is the standard declapract pattern for "detect file exists, delete it".

**verdict**: consistent — standard bad-practice pattern.

---

### mechanism 5: buildWorkflowSecretsBlock update

**proposed change**: replace readUseApikeysConfig() call with execSync keyrack CLI invocation.

**current pattern**: calls readUseApikeysConfig() which reads .agent/.../use.apikeys.json

**new pattern**: calls keyrack CLI which reads .agent/keyrack.yml

**analysis**: the mechanism (buildWorkflowSecretsBlock) is retained, only the data source changes. regex template injection logic is preserved.

**verdict**: consistent — retains extant mechanism, updates data source.

---

## issues found and fixed

none found. all proposed mechanisms match extant patterns in the codebase.

---

## non-issues verified

### non-issue 1: execSync usage

**why it holds**: already used in jest.integration.env.ts for psql check.

### non-issue 2: existsSync usage

**why it holds**: standard pattern throughout codebase (4+ usages in jest.integration.env.ts).

### non-issue 3: static import

**why it holds**: all imports in codebase use static ES module syntax.

### non-issue 4: FileCheckType.EXISTS for bad-practice

**why it holds**: standard declapract pattern for file detection and deletion.

### non-issue 5: buildWorkflowSecretsBlock retention

**why it holds**: reuses extant mechanism, only changes data source from json to cli.

---

## summary

| category | count |
|----------|-------|
| mechanisms scrutinized | 5 |
| duplication violations found | 0 |
| duplication violations fixed | 0 |
| non-issues verified | 5 |

blueprint uses extant mechanisms consistently. no new mechanisms duplicate functionality.
