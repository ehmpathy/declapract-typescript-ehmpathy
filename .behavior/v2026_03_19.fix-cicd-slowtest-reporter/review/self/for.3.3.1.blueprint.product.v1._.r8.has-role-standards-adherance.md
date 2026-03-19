# self-review r8: has-role-standards-adherance

## relevant briefs directories

for this blueprint (declapract best practice changes), the applicable mechanic standards are:

| directory | relevance |
|-----------|-----------|
| `lang.terms/` | term conventions apply to all artifacts |
| `code.prod/evolvable.architecture/` | architecture patterns (limited scope for config changes) |
| `code.prod/pitofsuccess.typedefs/` | type safety (limited scope for config changes) |

---

## lang.terms standards check

### rule.forbid.gerunds

**blueprint content check:**
- filediff tree: no gerunds
- codepath tree: no gerunds
- implementation notes: no gerunds

**verdict:** no violations.

### forbidden terms check

**blueprint content check:**
- no forbidden terms detected

**verdict:** no violations.

### rule.require.ubiqlang

**terms used in blueprint:**

| term | source | ubiquitous? |
|------|--------|-------------|
| slowtest | test-fns package | yes, package's official term |
| reporters | jest API | yes, jest's official term |
| integration | declapract conventions | yes, established term |
| minVersion | declapract syntax | yes, established directive |

**verdict:** all terms from established sources. no invented terms.

### rule.require.order.noun_adj

**blueprint variables/paths:**
- `.slowtest/integration.report.json` — noun structure, not adj-noun

**verdict:** follows convention.

---

## code.prod/evolvable.architecture standards check

### rule.require.bounded-contexts

**blueprint scope:**
- jest config changes stay in tests practice
- gitignore changes stay in git practice
- package.json changes stay in tests practice

**verdict:** changes respect practice boundaries.

### rule.prefer.wet-over-dry

**blueprint approach:**
- adds one entry to reporters array (not abstracting)
- adds one entry to ignoresSortable (not abstracting)
- updates one value in package.json (not abstracting)

**verdict:** no premature abstraction. stays wet.

---

## code.prod/pitofsuccess standards check

### rule.require.fail-fast

**not applicable:** this is config, not code logic.

### rule.forbid.failhide

**not applicable:** this is config, not error handling.

---

## anti-patterns check

| anti-pattern | present in blueprint? |
|--------------|----------------------|
| backwards compat shim | no |
| premature abstraction | no |
| overloaded terms | no |
| gerunds | no |
| forbidden terms | no |

---

## conclusion

blueprint adheres to mechanic role standards:
1. lang.terms: no gerunds, ubiquitous terms only
2. architecture: respects practice boundaries
3. pitofsuccess: not applicable (config only)
4. no anti-patterns detected

## why it holds

1. **gerunds:** reviewed all text, found none
2. **ubiqlang:** all terms from jest, test-fns, or declapract
3. **bounded contexts:** each file stays in its practice directory
4. **wet over dry:** direct config changes, no abstractions
5. **anti-patterns:** none detected

blueprint follows mechanic standards.
