# self-review r4: has-pruned-backcompat (deeper review)

## deeper examination

re-read the blueprint, vision, and wish. read each line of the best practice files. looked for any hidden backwards compat shims.

---

## hidden concern: moduleNameMapper pattern

**current state in best practice:**
```ts
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1',
  '^@src/(.*)$': '<rootDir>/src/$1',
},
```

**is this backwards compat?**
yes — two patterns exist to support both `@/` and `@src/` import paths.

**was this explicitly requested?**
no — this is extant behavior, not part of our changes.

**does our blueprint touch this?**
no — our changes only add the reporters array. we do not modify moduleNameMapper.

**verdict:** not our concern. extant backwards compat, not introduced by this blueprint.

---

## hidden concern: default reporter retained

**our change:**
```ts
reporters: [
  ['default', { summaryThreshold: 0 }],  // kept
  ['test-fns/slowtest.reporter.jest', { ... }],  // added
],
```

**is this backwards compat?**
no — this is correct behavior. the default reporter provides the standard jest output. deletion would break expected output.

**was retention explicitly requested?**
yes — the vision shows both reporters in the "exact config change" section.

**verdict:** not backwards compat. it is the intended behavior.

---

## hidden concern: .gitignore sortable vs ordered

**the ignoresSortable mechanism:**
```ts
const ignoresSortable = [
  '*.log',
  // ...
  '.slowtest/integration.report.json',  // new entry
].sort();
```

**could we have put it in ignoresOrdered instead?**
no — the ignoresOrdered array is for patterns that have order dependencies (like node_modules negations). `.slowtest/integration.report.json` has no negations or order dependencies.

**is this a backwards compat decision?**
no — it is the correct categorization based on the mechanism's semantics.

**verdict:** correct placement, not backwards compat.

---

## hidden concern: test-fns version gap

**the gap:**
- extant minVersion: 1.7.2
- new minVersion: 1.15.7
- gap: ~8 minor versions

**could intermediate versions break?**
checked npm: test-fns follows semver. 1.15.7 is backwards compatible with 1.7.2 API.

**should we preserve fallback for 1.7.2?**
no — the wish explicitly says "latest version". a fallback would be backwards compat we did not ask for.

**verdict:** no backwards compat needed. version bump is clean.

---

## conclusion

examined four potential backwards compat concerns:
1. moduleNameMapper — outside scope
2. default reporter — intentional, not compat
3. ignoresSortable — correct categorization
4. version gap — semver-safe, no fallback needed

no hidden backwards compatibility shims introduced by this blueprint.

no open questions to flag.
