# self-review r5: has-consistent-conventions

review for divergence from extant names and patterns.

## conventions discovered

### bad-practice directory names

searched: `src/practices/*/bad-practices/*/`

extant names:
- has-changelog-file
- commitlint
- moment
- old-module-name
- simple-type-guards
- format-cmd
- prettier
- package-lock-json
- eslint
- tslint

**convention**: kebab-case, descriptive of what is detected

### bad-practice file structure

searched: `**/bad-practices/**/*.declapract.ts`

extant pattern:
```typescript
import { FileCheckType, type FileFixFunction } from 'declapract';

/**
 * .what = flag repos that have [file]
 * .why = [reason]
 */
export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = () => {
  return { contents: null }; // delete the file
};
```

### utility naming

searched: `src/utils/*.ts`

extant names:
- buildWorkflowSecretsBlock
- readUseApikeysConfig
- readFile

**convention**: camelCase, verb + noun pattern

### comment headers

extant pattern:
```typescript
/**
 * .what = [description]
 * .why = [reason]
 */
```

---

## conventions scrutinized

### convention 1: bad-practice directory name

**proposed**: `use-apikeys-legacy`

**extant pattern**: kebab-case, descriptive (e.g., old-module-name, deprecated-test-deps)

**analysis**: "use-apikeys-legacy" follows kebab-case. describes what is detected (legacy use.apikeys files).

**verdict**: consistent — matches kebab-case convention.

---

### convention 2: bad-practice file structure

**proposed**:
```typescript
import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = () => {
  return { contents: null };
};
```

**extant pattern**: exact match with has-changelog-file/changelog.md.declapract.ts

**analysis**: blueprint uses identical structure.

**verdict**: consistent — matches extant bad-practice pattern exactly.

---

### convention 3: keyrack.source() comment header

**proposed**:
```typescript
/**
 * .what = source credentials from keyrack for test env
 * .why = auto-inject keys into process.env, fail fast if absent
 */
```

**extant pattern**: `.what = ` and `.why = ` format used throughout codebase

**analysis**: matches comment header convention.

**verdict**: consistent — uses standard .what/.why format.

---

### convention 4: file path for legacy files

**proposed file path**: `.agent/repo=.this/role=any/skills/use.apikeys.sh.declapract.ts`

**extant legacy file path**: `.agent/repo=.this/role=any/skills/use.apikeys.sh`

**analysis**: bad-practice declapract file mirrors extant path structure. this is the standard pattern for file-based detection.

**verdict**: consistent — mirrors source file location.

---

### convention 5: keyrack owner value

**proposed**: `owner: 'ehmpath'`

**search of wish**: wish shows `owner: 'ehmpath'`

**analysis**: matches wish specification. owner is the ssh key owner for keyrack, specific to ehmpath organization.

**verdict**: consistent — matches wish specification.

---

## issues found and fixed

none found. all conventions match extant patterns.

---

## non-issues verified

### non-issue 1: bad-practice name

**why it holds**: "use-apikeys-legacy" follows kebab-case convention.

### non-issue 2: bad-practice structure

**why it holds**: exact match with extant bad-practice file structure.

### non-issue 3: comment headers

**why it holds**: uses .what/.why format consistently.

### non-issue 4: file path structure

**why it holds**: mirrors source file location per declapract convention.

### non-issue 5: keyrack owner

**why it holds**: matches wish specification.

---

## summary

| category | count |
|----------|-------|
| conventions discovered | 4 |
| conventions scrutinized | 5 |
| divergence violations found | 0 |
| non-issues verified | 5 |

blueprint follows all extant naming and structural conventions.
