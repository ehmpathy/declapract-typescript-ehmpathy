# self-review r4: has-pruned-yagni

deeper pass. scrutinize implementation patterns, not just feature presence.

## code patterns scrutinized

### pattern 1: async readKeyrackConfig with util.promisify

**code from blueprint** (lines 113-131):
```typescript
export const readKeyrackConfig = async (input: {
  projectRootDirectory: string;
}): Promise<KeyrackConfig | null> => {
  const configPath = path.join(input.projectRootDirectory, KEYRACK_PATH);

  const exists = await util
    .promisify(fs.access)(configPath, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
  if (!exists) return null;

  try {
    const contents = await util.promisify(fs.readFile)(configPath, 'utf-8');
    const parsed = yaml.parse(contents) as KeyrackConfig;
    return parsed;
  } catch {
    return null;
  }
};
```

**question**: is async necessary? could this be sync?

**analysis**:
- extant readUseApikeysConfig is async — but that's not justification, could be legacy
- buildWorkflowSecretsBlock is async — but could be made sync
- declapract check/fix functions can be sync or async — both work
- sync code is simpler: no await, no util.promisify, no Promise wrapper

**simpler version**:
```typescript
export const readKeyrackConfig = (input: {
  projectRootDirectory: string;
}): KeyrackConfig | null => {
  const configPath = path.join(input.projectRootDirectory, KEYRACK_PATH);

  if (!fs.existsSync(configPath)) return null;

  try {
    const contents = fs.readFileSync(configPath, 'utf-8');
    return yaml.parse(contents) as KeyrackConfig;
  } catch {
    return null;
  }
};
```

**verdict**: YAGNI violation. async adds complexity without benefit.

**how i fixed**: updated blueprint to use sync implementation:
```typescript
import fs from 'node:fs';
import path from 'node:path';

import yaml from 'yaml';

export interface KeyrackConfig {
  org: string;
  'env.test'?: string[];
}

const KEYRACK_PATH = '.agent/keyrack.yml';

export const readKeyrackConfig = (input: {
  projectRootDirectory: string;
}): KeyrackConfig | null => {
  const configPath = path.join(input.projectRootDirectory, KEYRACK_PATH);

  if (!fs.existsSync(configPath)) return null;

  try {
    const contents = fs.readFileSync(configPath, 'utf-8');
    return yaml.parse(contents) as KeyrackConfig;
  } catch {
    return null;
  }
};
```

**impact**: buildWorkflowSecretsBlock and .test.yml.declapract.ts can also become sync. but if callers are already async, they stay async and just don't await the sync call.

---

### pattern 2: eslint disable comment in jest env file

**code from blueprint** (lines 145-146):
```typescript
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { keyrack } = require('rhachet/keyrack');
```

**question**: is the eslint-disable comment necessary?

**analysis**:
- require() is used for sync import
- eslint rule forbids require-imports for good reason (prefer esm)
- we use require() specifically because dynamic import is async
- comment explains why we violate the rule

**verdict**: not YAGNI. comment is necessary to suppress lint error and document rationale.

---

### pattern 3: util import in readKeyrackConfig

**code from blueprint** (line 100):
```typescript
import util from 'node:util';
```

**question**: is util import needed after sync refactor?

**analysis**: util.promisify was only used for async fs operations. with sync refactor, util import is no longer needed.

**verdict**: YAGNI violation (after sync refactor). util import removed.

---

### pattern 4: separate input object vs direct parameter

**code from blueprint**:
```typescript
export const readKeyrackConfig = (input: {
  projectRootDirectory: string;
}): ...
```

**question**: is input object pattern necessary for single parameter?

**analysis**:
- input object pattern is per briefs: rule.require.input-context-pattern
- single parameter still benefits from named key
- matches extant readUseApikeysConfig signature
- enables future parameter extension without signature change

**verdict**: not YAGNI. follows established pattern per briefs.

---

### pattern 5: test file for readKeyrackConfig

**code from blueprint** (line 48):
```
├── [+] readKeyrackConfig.test.ts
```

**question**: is a test file needed?

**analysis**:
- readKeyrackConfig has branch logic (file exists, parse succeeds, parse fails)
- tests verify behavior for each branch
- extant readUseApikeysConfig has tests
- per briefs: tests are implicit requirement

**verdict**: not YAGNI. test coverage is required.

---

## issues found and fixed

### issue 1: async pattern adds unnecessary complexity

**what i found**: readKeyrackConfig uses async/await and util.promisify when sync fs operations suffice.

**how i fixed**: refactored to sync implementation:
- removed async keyword
- replaced util.promisify(fs.access) with fs.existsSync
- replaced util.promisify(fs.readFile) with fs.readFileSync
- removed util import
- changed return type from Promise<...> to direct return

**why this matters**: async adds cognitive load and execution overhead. sync is simpler when no true async operations are needed.

---

### issue 2: util import after sync refactor

**what i found**: util import is no longer needed after sync refactor.

**how i fixed**: removed `import util from 'node:util';` from blueprint code.

**why this matters**: dead imports add noise.

---

## non-issues verified

### non-issue 1: KeyrackConfig interface (after r3 fix)

**why it holds**: env.prep and env.prod already removed in r3. interface is now minimal.

### non-issue 2: .declapract.readme.md (after r3 fix)

**why it holds**: already removed in r3.

### non-issue 3: eslint-disable comment

**why it holds**: documents intentional rule violation. necessary for sync require().

### non-issue 4: input object pattern

**why it holds**: follows established pattern per briefs. single parameter still benefits.

### non-issue 5: test file presence

**why it holds**: tests are implicit requirement per briefs.

---

## cumulative fixes applied

| round | issue | fix |
|-------|-------|-----|
| r3 | unused interface fields | removed env.prep/env.prod |
| r3 | optional readme file | removed .declapract.readme.md |
| r4 | async complexity | refactored to sync |
| r4 | dead util import | removed util import |

---

## summary

| category | count |
|----------|-------|
| patterns scrutinized | 5 |
| YAGNI violations found | 2 |
| YAGNI violations fixed | 2 |
| non-issues verified | 5 |

blueprint now uses minimal sync implementation.

