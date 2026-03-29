# self-review r7: has-consistent-conventions

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

### import order convention

searched: `jest.integration.env.ts` imports

extant order:
1. node builtins with `node:` prefix (child_process, fs, path, util)
2. blank line
3. third-party packages (@jest/globals)

**convention**: node builtins first, then blank line, then third-party.

### comment header format

searched: `.what = ` and `.why = ` patterns in src/

found 28 usages across codebase. two variants:
- single line: `.what = description` + `.why = reason`
- multi-line: `.why =` followed by bullet points

**convention**: use `.what = ` and `.why = ` format in JSDoc headers.

---

## issues found and fixed

### issue 1: bad-practice test files absent from filediff

**found**: blueprint filediff shows only `.declapract.ts` files for bad-practice:

```
└── bad-practices/
    └── [+] old-use-apikeys/
        ├── [+] .agent/repo=.this/role=any/skills/use.apikeys.sh.declapract.ts
        └── [+] .agent/repo=.this/role=any/skills/use.apikeys.json.declapract.ts
```

**extant convention**: every bad-practice `.declapract.ts` has a paired `.declapract.test.ts` file (35 examples found).

**evidence**:
- `changelog.md.declapract.test.ts` ✓
- `package.json.declapract.test.ts` in commitlint ✓
- `rhachet.use.ts.declapract.test.ts` ✓

**fix applied**: add test files to filediff:

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

### non-issue 1: import order

**proposed**:
```typescript
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { keyrack } from 'rhachet/keyrack';
```

**why it holds**: matches extant pattern (node builtins first, blank line, third-party).

### non-issue 2: comment header format

**proposed**:
```typescript
/**
 * .what = source credentials from keyrack for test env
 * .why = auto-inject keys into process.env, fail fast if absent
 */
```

**why it holds**: matches extant `.what = ` and `.why = ` format.

### non-issue 3: node: prefix usage

**proposed**: `from 'node:fs'`, `from 'node:path'`, `from 'node:child_process'`

**why it holds**: all node imports in codebase use `node:` prefix.

### non-issue 4: bad-practice directory name

**verified**: r6 fixed `use-apikeys-legacy` → `old-use-apikeys`.

**why it holds**: matches `old-*` prefix convention.

---

## summary

| category | count |
|----------|-------|
| conventions discovered | 3 |
| conventions scrutinized | 4 |
| divergence violations found | 1 |
| divergence violations fixed | 1 |
| non-issues verified | 4 |

found one real divergence: bad-practice test files were absent from filediff. fixed by add of `.declapract.test.ts` files.
