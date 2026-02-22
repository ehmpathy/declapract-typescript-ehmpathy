# rule.forbid.glob-not-catchall

## .what

glob patterns that move directories must be catch-all, not extension-specific

## .why

when moving a directory, extension-specific globs are rarely intentional — almost always an accident where the author meant to move all files but wrote `**/*.ts` instead of `**/*`

the result is silent data loss:
- only `.ts` files are moved
- `.json`, `.yml`, `.md`, etc. are silently dropped
- no error, no alert — just gone

## .the bug

when a bad-practice uses extension-specific patterns:

```
accept.blackbox/
├── somefile.ts              # matched by **/*.ts.declapract.ts
├── config.json              # NOT matched — silently dropped
└── readme.md                # NOT matched — silently dropped
```

after `declapract fix`:

```
blackbox/
├── somefile.ts              # moved
# config.json is gone — never matched, never moved
# readme.md is gone — never matched, never moved
```

## .how

use catch-all patterns when moving directories:

### bad — extension-specific

```
directory/**/*.ts.declapract.ts
```

### good — catch-all

```
directory/**/*.declapract.ts
```

### the fix function

```ts
import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = (contents, context) => {
  const newPath = context.relativeFilePath.replace(
    /^old-directory\//,
    'new-directory/',
  );
  return {
    contents: contents ?? null,
    relativeFilePath: newPath,
  };
};
```

## .see also

- `src/practices/tests/bad-practices/old-acceptance-dir-location/` — the source of this lesson

