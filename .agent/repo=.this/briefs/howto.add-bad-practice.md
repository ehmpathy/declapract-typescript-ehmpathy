# Adding a Bad Practice

Bad practices define patterns that should be flagged and optionally auto-fixed in codebases.

## Directory Structure

```
src/practices/{practice-name}/bad-practices/{bad-practice-name}/
├── package.json                       # Pattern to match (optional)
├── package.json.declapract.ts         # Check and fix logic for package.json
├── package.json.declapract.test.ts    # Unit tests for the fix
├── {file}.declapract.ts               # Check and fix logic for specific files
├── {file}.declapract.test.ts          # Unit tests for the fix
├── src/**/*.ts.declapract.ts          # Wildcard pattern for source files
├── src/**/*.ts.declapract.test.ts     # Unit tests for wildcard fixes
└── .declapract.readme.md              # Description of the bad practice (optional)
```

## Common Patterns

### 1. Remove a dependency from package.json

Create `package.json` with the dependency to match:
```json
{
  "devDependencies": {
    "bad-package": "@declapract{check.minVersion('0.0.0')}"
  }
}
```

Create `package.json.declapract.ts`:
```typescript
import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  const packageJSON = JSON.parse(contents);
  const updatedPackageJSON = {
    ...packageJSON,
    devDependencies: {
      ...packageJSON.devDependencies,
      'bad-package': undefined,
    },
  };
  return {
    contents: JSON.stringify(updatedPackageJSON, null, 2),
  };
};
```

### 2. Replace imports in source files

Create `src/**/*.ts.declapract.ts`:
```typescript
import { type FileCheckFunction, type FileFixFunction } from 'declapract';

export const check: FileCheckFunction = (contents) => {
  if (contents?.includes("from 'old-package'")) return; // matches
  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};
  return {
    contents: contents.replace(
      /from 'old-package'/g,
      "from 'new-package'",
    ),
  };
};
```

### 3. Delete a file if it exists

Create `{filename}.declapract.ts`:
```typescript
import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = () => {
  return { contents: null }; // null removes the file
};
```

### 4. Remove multiple dependencies and scripts

```typescript
import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

const depsToRemove = ['dep1', 'dep2'];
const scriptsToRemove = ['script1', 'script2'];

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  const packageJSON = JSON.parse(contents);

  const updatedDevDeps = { ...packageJSON.devDependencies };
  for (const dep of depsToRemove) delete updatedDevDeps[dep];

  const updatedScripts = { ...packageJSON.scripts };
  for (const script of scriptsToRemove) delete updatedScripts[script];

  return {
    contents: JSON.stringify({
      ...packageJSON,
      devDependencies: updatedDevDeps,
      scripts: updatedScripts,
    }, null, 2),
  };
};
```

## FileCheckType Options

- `FileCheckType.CONTAINS` - File exists and contains the pattern defined in the sibling file
- `FileCheckType.EXISTS` - File exists (any content)

## Unit Tests

Always add unit tests for fix functions. Create a `.declapract.test.ts` file alongside each `.declapract.ts` file.

### Testing a package.json fix

```typescript
import { fix } from './package.json.declapract';

describe('bad-practice-name package.json', () => {
  it('should remove bad-package from devDependencies', async () => {
    const contents = JSON.stringify(
      {
        devDependencies: {
          'bad-package': '1.0.0',
          jest: '29.3.1',
        },
      },
      null,
      2,
    );

    const { contents: fixed } = await fix(contents, {} as any);
    const parsed = JSON.parse(fixed!);

    expect(parsed.devDependencies['bad-package']).toBeUndefined();
    expect(parsed.devDependencies.jest).toBe('29.3.1');
  });
});
```

### Testing a source file fix

The test file should be placed alongside the declapract file (e.g., `src/**/*.ts.declapract.test.ts` next to `src/**/*.ts.declapract.ts`).

```typescript
import { check, fix } from './*.ts.declapract';

describe('bad-practice-name source files', () => {
  it('should match files that import from old-package', () => {
    const contents = `import { something } from 'old-package';`;
    expect(() => check(contents, {} as any)).not.toThrow();
  });

  it('should not match files without old-package imports', () => {
    const contents = `import { something } from 'other-package';`;
    expect(() => check(contents, {} as any)).toThrow('does not match bad practice');
  });

  it('should replace old-package imports with new-package', async () => {
    const contents = `import { something } from 'old-package';`;
    const { contents: fixed } = await fix(contents, {} as any);

    expect(fixed).toContain("from 'new-package'");
    expect(fixed).not.toContain('old-package');
  });
});
```

## Key Points

- Use `type` imports for TypeScript types: `import { FileCheckType, type FileFixFunction }`
- Return `{ contents: null }` to delete a file
- Return `{ contents: undefined }` or `{}` to leave the file unchanged
- Use wildcard patterns like `src/**/*.ts.declapract.ts` for matching multiple files
- The fix function receives the file contents and returns the fixed contents
- Always add unit tests for fix functions
