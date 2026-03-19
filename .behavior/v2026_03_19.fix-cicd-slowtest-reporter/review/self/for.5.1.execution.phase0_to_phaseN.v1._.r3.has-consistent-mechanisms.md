# self-review r3: has-consistent-mechanisms

## deeper mechanism search

searched for related patterns in the codebase to ensure we reused extant mechanisms.

### search 1: reporter patterns

**searched for:** `reporters:` in jest config files

**found patterns:**
```ts
// jest.unit.config.ts
reporters: [['default', { summaryThreshold: 0 }]],

// jest.integration.config.ts (before change)
reporters: [['default', { summaryThreshold: 0 }]],

// jest.acceptance.config.ts
reporters: [['default', { summaryThreshold: 0 }]],
```

**our change follows this pattern:** yes — we append to the reporters array with the same tuple format.

### search 2: gitignore patterns

**searched for:** `ignoresSortable` in git practice

**found mechanism:**
```ts
const ignoresSortable = [
  '*.log',
  // ... other entries
].sort();
```

**our change follows this pattern:** yes — we add one entry to the array.

### search 3: version directive patterns

**searched for:** `check.minVersion` in package.json files

**found patterns:**
```ts
"@types/jest": "@declapract{check.minVersion('30.0.0')}",
"jest": "@declapract{check.minVersion('30.2.0')}",
"test-fns": "@declapract{check.minVersion('1.7.2')}",
```

**our change follows this pattern:** yes — exact same directive syntax.

---

## conclusion

no new mechanisms. all changes use extant patterns.

### why it holds

| change | extant mechanism | reused? |
|--------|-----------------|---------|
| slowtest reporter | reporter tuple array | yes |
| gitignore entry | ignoresSortable array | yes |
| test-fns version | minVersion directive | yes |
| rhachet-brains-xai version | minVersion directive | yes |

---

## potential concerns examined

### concern 1: could we have used a different reporter mechanism?

**examined:** jest supports multiple reporter formats. could we have used a different pattern?

**found:** the tuple format `['reporter', { options }]` is the standard jest pattern. this is what the codebase uses. no alternative pattern exists in this codebase.

**verdict:** correct mechanism used.

### concern 2: could we have used a different gitignore pattern?

**examined:** the codebase has two arrays — ignoresSortable and ignoresOrdered. did we use the right one?

**found:** ignoresSortable is for entries with no order dependencies. `.slowtest/integration.report.json` has no order dependency — it can appear anywhere in the sorted list. ignoresOrdered is for patterns like `node_modules` followed by `!.test*/**/node_modules`.

**verdict:** correct array used.

### concern 3: could we have used a different version check pattern?

**examined:** the codebase uses `check.minVersion`. are there other patterns?

**found:** `check.minVersion` is the standard pattern for all dependencies in this codebase. there is no alternative.

**verdict:** correct directive used.

---

## summary

all changes follow extant patterns. no new mechanisms introduced. no opportunity to reuse extant patterns was missed.
