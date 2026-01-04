# Adding a Best Practice

Best practices define the ideal state that codebases should conform to.

## Directory Structure

```
src/practices/{practice-name}/best-practice/
├── package.json                    # Expected dependencies and scripts
├── package.json.declapract.ts      # Custom check logic (optional)
├── {config-file}                   # Expected config files (e.g., biome.json)
├── {config-file}.declapract.ts     # Custom check logic for config
├── src/                            # Expected source file patterns
│   └── utils/
│       └── example.ts
├── .declapract.readme.md           # Description of the practice
└── .declapract.todo.md             # Future improvements (optional)
```

## Common Patterns

### 1. Define required dependencies

Create `package.json`:
```json
{
  "devDependencies": {
    "@biomejs/biome": "@declapract{check.minVersion('2.3.8')}",
    "depcheck": "1.4.3"
  },
  "scripts": {
    "fix:lint": "biome check --write src",
    "test:lint": "npm run test:lint:biome && npm run test:lint:deps"
  }
}
```

### 2. Custom check logic with FileCheckFunction

Create `package.json.declapract.ts`:
```typescript
import { type FileCheckFunction } from 'declapract';
import expect from 'expect';

export const check: FileCheckFunction = (contents) => {
  const pkg = JSON.parse(contents ?? '{}');
  expect(pkg).toMatchObject(
    expect.objectContaining({
      devDependencies: expect.objectContaining({
        typescript: expect.any(String),
      }),
    }),
  );
};
```

### 3. Define expected config files

Simply create the config file as it should appear:
```js
// biome.json
{
  "linter": {
    "enabled": true
  }
}
```

### 4. Define expected source file patterns

Create files in the expected structure:
```
src/
├── utils/
│   └── config/
│       └── getConfig.ts
└── domain/
    └── index.ts
```

## Check Patterns with declapract Syntax

In `package.json` and other files, use declapract syntax:

- `@declapract{check.minVersion('1.0.0')}` - Minimum version check
- Exact values for scripts and config that must match exactly

## Key Points

- Best practices define what SHOULD exist
- Files in best-practice directories are compared against the target codebase
- Use `.declapract.readme.md` to document why this practice exists
- Use `.declapract.todo.md` to track planned improvements
- The `package.json.declapract.ts` file allows custom validation beyond simple matching
