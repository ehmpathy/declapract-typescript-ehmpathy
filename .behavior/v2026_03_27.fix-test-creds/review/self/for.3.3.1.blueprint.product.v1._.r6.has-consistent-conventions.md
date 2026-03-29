# self-review r6: has-consistent-conventions

deeper review for divergence from extant names and patterns.

## conventions discovered

### bad-practice test file convention

searched: `src/practices/**/bad-practices/**/*.declapract.test.ts`

found: 35 bad-practice test files across codebase

extant pattern in `changelog.md.declapract.test.ts`:
```typescript
import { FileCheckType } from 'declapract';

import { check, fix } from './changelog.md.declapract';

describe('has-changelog-file changelog.md', () => {
  it('should check for file existence', () => {
    expect(check).toEqual(FileCheckType.EXISTS);
  });

  it('should return null contents to delete the file', async () => {
    const result = await fix('# Changelog...', {} as any);
    expect(result.contents).toBeNull();
  });
});
```

**convention**: every `.declapract.ts` file in bad-practices has a paired `.declapract.test.ts` file.

### bad-practice directory name convention for "old" patterns

searched: git ls-tree output for bad-practices directories

extant names with "old" or "deprecated" prefix:
- old-names
- old-module-name
- old-import-paths
- old-integration-test-db-paths
- old-packagejson-cmd-names
- old-sls-plugins
- old-config-file-names
- old-acceptance-dir-location
- deprecated-test-deps
- deprecated-use-file

**convention**: `old-[thing]` or `deprecated-[thing]`, NOT `[thing]-legacy`

### node: import prefix convention

searched: `from 'node:` in src/**/*.ts

extant imports:
- `import fs from 'node:fs'`
- `import path from 'node:path'`
- `import util from 'node:util'`
- `import { execSync } from 'node:child_process'`
- `import { existsSync } from 'node:fs'`
- `import { join } from 'node:path'`

**convention**: use `node:` prefix for all node core modules

### rhachet import convention

searched: `from.*rhachet` patterns

extant imports:
- `from 'rhachet'` - types
- `from 'rhachet-roles-*'` - role registries

**convention**: import from 'rhachet' or subpaths like 'rhachet/keyrack'

---

## issues found and fixed

### issue 1: bad-practice name diverges from convention

**found**: blueprint proposes `use-apikeys-legacy`

**extant convention**: `old-[thing]` prefix, not `[thing]-legacy` suffix

**evidence**:
- old-names ✓
- old-module-name ✓
- old-import-paths ✓
- deprecated-test-deps ✓

**fix applied**: renamed to `old-use-apikeys` in blueprint

### issue 2: bad-practice test files absent from filediff

**found**: blueprint filediff showed only `.declapract.ts` files for bad-practice, not their test files.

**extant convention**: every bad-practice `.declapract.ts` has a paired `.declapract.test.ts` file (35 examples found).

**evidence**:
- `changelog.md.declapract.test.ts` ✓
- `package.json.declapract.test.ts` in commitlint ✓
- `rhachet.use.ts.declapract.test.ts` ✓

**fix applied**: added test files to filediff and code changes section

**updated filediff**:
```
└── bad-practices/
    └── [+] old-use-apikeys/
        ├── [+] .agent/repo=.this/role=any/skills/use.apikeys.sh.declapract.ts
        ├── [+] .agent/repo=.this/role=any/skills/use.apikeys.sh.declapract.test.ts
        ├── [+] .agent/repo=.this/role=any/skills/use.apikeys.json.declapract.ts
        └── [+] .agent/repo=.this/role=any/skills/use.apikeys.json.declapract.test.ts
```

---

## non-issues verified

### non-issue 1: node: import prefix

**proposed**:
```typescript
import { existsSync } from 'node:fs';
import { join } from 'node:path';
```

**why it holds**: matches extant pattern throughout codebase.

### non-issue 2: rhachet import

**proposed**:
```typescript
import { keyrack } from 'rhachet/keyrack';
```

**why it holds**: subpath imports from rhachet are the standard pattern.

### non-issue 3: execSync import

**proposed**:
```typescript
import { execSync } from 'node:child_process';
```

**why it holds**: matches extant pattern in jest.integration.env.ts.

### non-issue 4: bad-practice file structure

**why it holds**: FileCheckType.EXISTS + fix return of { contents: null } matches has-changelog-file pattern exactly.

---

## blueprint update required

the bad-practice directory name must change:

| before (divergent) | after (consistent) |
|--------------------|--------------------|
| `use-apikeys-legacy` | `old-use-apikeys` |

this aligns with the codebase convention for bad-practices that detect outdated patterns.

---

## summary

| category | count |
|----------|-------|
| conventions discovered | 4 |
| conventions scrutinized | 5 |
| divergence violations found | 2 |
| divergence violations fixed | 2 |
| non-issues verified | 4 |

found two real divergences:
1. bad-practice name used `-legacy` suffix instead of `old-` prefix. fixed by rename to `old-use-apikeys`.
2. bad-practice test files were absent from filediff. fixed by add of `.declapract.test.ts` files.
