# Declapract Overview

Declapract is a declarative best-practices tool that checks codebases against defined practices and can auto-fix violations.

## Repository Structure

```
src/
├── practices/                      # All practice definitions
│   ├── {practice-name}/
│   │   ├── best-practice/          # What code SHOULD look like
│   │   └── bad-practices/          # Patterns to flag and fix
│   │       ├── {bad-practice-1}/
│   │       └── {bad-practice-2}/
└── useCases.yml                    # Defines which practices apply to which use cases
```

## Core Concepts

### Practices
A practice is a category of code quality rules (e.g., `lint`, `errors`, `typescript`).

### Best Practices
Define the ideal state - files, dependencies, and configurations that should exist.

### Bad Practices
Define anti-patterns that should be flagged and can be auto-fixed.

### Use Cases
Define which practices apply to different project types (e.g., `lambda`, `npm-module`).

## File Types

### Pattern Files
Plain files (e.g., `package.json`, `tsconfig.json`) define the expected content.

### Declapract Files (`*.declapract.ts`)
TypeScript files that export check and fix functions:

```typescript
import { FileCheckType, type FileCheckFunction, type FileFixFunction } from 'declapract';

// Simple check types
export const check = FileCheckType.CONTAINS; // or EXISTS

// Or custom check function
export const check: FileCheckFunction = (contents) => {
  if (/* matches bad pattern */) return;
  throw new Error('does not match');
};

// Optional fix function
export const fix: FileFixFunction = (contents) => {
  return { contents: fixedContents };
};
```

## Wildcard Patterns

Use glob patterns in filenames to match multiple files:
- `src/**/*.ts.declapract.ts` - matches all .ts files in src
- `**/*.test.ts.declapract.ts` - matches all test files

## Common Operations

| Goal | Approach |
|------|----------|
| Remove a dependency | Bad practice with fix setting dep to `undefined` |
| Replace imports | Bad practice with regex replace in fix |
| Delete a file | Bad practice with fix returning `{ contents: null }` |
| Require a dependency | Best practice with `@declapract{check.minVersion('x.y.z')}` |
| Require a config file | Best practice with the file contents |
