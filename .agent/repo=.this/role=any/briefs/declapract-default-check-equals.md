# declapract default check equals

## .what

when a best-practice file has no explicit `.declapract.ts` companion, declapract uses `FileCheckType.EQUALS` by default.

## .why

- most best-practice files should match exactly
- reduces boilerplate — no need to create `.declapract.ts` for every file
- explicit `.declapract.ts` files are only needed when:
  - `CONTAINS` or `EXISTS` check types are required
  - custom check logic via `FileCheckFunction`
  - custom fix logic via `FileFixFunction`

## .examples

### implicit equals (no .declapract.ts needed)

```
best-practice/
├── .github/workflows/.deploy-sls.yml    # checked with EQUALS by default
├── tsconfig.json                         # checked with EQUALS by default
└── biome.json                            # checked with EQUALS by default
```

declapract compares target files to these templates byte-for-byte.

### explicit check (requires .declapract.ts)

```
best-practice/
├── package.json                          # pattern file with @declapract{...} syntax
└── package.json.declapract.ts            # CONTAINS check for partial match
```

```typescript
// package.json.declapract.ts
import { FileCheckType } from 'declapract';

export const check = FileCheckType.CONTAINS;
```

## .when to create .declapract.ts

| need | create .declapract.ts? |
|------|------------------------|
| exact file match | no — default EQUALS |
| partial content match | yes — use CONTAINS |
| file existence only | yes — use EXISTS |
| custom validation | yes — use FileCheckFunction |
| custom fix logic | yes — export fix function |
