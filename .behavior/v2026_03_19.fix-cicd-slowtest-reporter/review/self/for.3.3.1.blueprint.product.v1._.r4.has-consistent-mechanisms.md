# self-review r4: has-consistent-mechanisms

## search for extant mechanisms

searched the codebase for patterns related to our blueprint:

1. **jest reporter patterns** — found in `jest.unit.config.ts`, `jest.acceptance.config.ts`
2. **gitignore patterns** — found in `.gitignore.declapract.ts`
3. **package.json version checks** — found in many `package.json.declapract.ts` files

---

## mechanism.1: jest reporters configuration

**extant pattern:**
```ts
// jest.unit.config.ts and jest.acceptance.config.ts
reporters: [['default', { summaryThreshold: 0 }]],
```

**our blueprint:**
```ts
// jest.integration.config.ts
reporters: [
  ['default', { summaryThreshold: 0 }],
  ['test-fns/slowtest.reporter.jest', { slow: '10s', output: '...' }],
],
```

**does this duplicate extant functionality?**
no — we extend the extant pattern (add slowtest to default), not duplicate it.

**is this consistent with extant mechanisms?**
yes — same array syntax, same default reporter, just one more entry.

**verdict:** consistent extension, not duplication.

---

## mechanism.2: gitignore sortable entry

**extant pattern:**
```ts
const ignoresSortable = [
  '*.log',
  '.artifact',
  '.env',
  // ...
].sort();
```

**our blueprint:**
```ts
const ignoresSortable = [
  // ... extant entries
  '.slowtest/integration.report.json',  // new entry
].sort();
```

**does this duplicate extant functionality?**
no — we add one entry to the extant array.

**is this consistent with extant mechanisms?**
yes — same array, same sort mechanism, same check/fix functions.

**verdict:** consistent extension, not duplication.

---

## mechanism.3: package.json minVersion check

**extant pattern:**
```json
{
  "devDependencies": {
    "jest": "@declapract{check.minVersion('30.2.0')}",
    "test-fns": "@declapract{check.minVersion('1.7.2')}"
  }
}
```

**our blueprint:**
```json
{
  "devDependencies": {
    "test-fns": "@declapract{check.minVersion('1.15.7')}"
  }
}
```

**does this duplicate extant functionality?**
no — we update one extant entry, not create a new mechanism.

**is this consistent with extant mechanisms?**
yes — same `@declapract{check.minVersion('...')}` syntax.

**verdict:** consistent update, not duplication.

---

## conclusion

all three blueprint components use extant mechanisms:
1. jest reporters — extends extant array
2. gitignore — adds to extant sortable array
3. package.json — updates extant minVersion check

no new mechanisms introduced. no duplication of extant functionality.
